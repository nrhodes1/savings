"use client";

import { useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { useHouseholdState } from "@/hooks/useHouseholdState";
import { Header } from "@/components/Header";
import { SegmentedControl, type Segment } from "@/components/SegmentedControl";
import { AccountChip } from "@/components/AccountChip";
import { Headline } from "@/components/Headline";
import { SavingsChart, type ChartDatum } from "@/components/SavingsChart";
import { HorizonSlider } from "@/components/HorizonSlider";
import { AccountsList } from "@/components/AccountsList";
import { GoalPanel } from "@/components/GoalPanel";
import { ConflictBar } from "@/components/ConflictBar";
import { ScenarioSwitcher } from "@/components/ScenarioSwitcher";
import {
  aggregateSeries,
  deflate,
  findCrossing,
  projectAccount,
  toRealDollars,
  type AggregatePoint,
} from "@/lib/projection";
import { solveGoal } from "@/lib/goal";
import { addAccountToScenarios, createScenario, removeAccountFromScenarios, withScenarioContribution } from "@/lib/scenario";
import { addMonths, formatFromNow, formatMonthYear, monthsUntil } from "@/lib/date";
import { validateGoalAmount, validateGoalDate } from "@/lib/validation";
import type { Account, ScenarioAccount } from "@/lib/types";

export default function Home() {
  const { state, status, updateState, conflict, loadTheirVersion } = useHouseholdState();
  const [now] = useState(() => new Date());
  const [segment, setSegment] = useState<Segment>("together");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [hoverDatum, setHoverDatum] = useState<ChartDatum | null>(null);
  const [justAddedScenarioId, setJustAddedScenarioId] = useState<string | null>(null);

  const months = state ? state.assumptions.horizonYears * 12 : 0;

  const activeScenario = useMemo(() => {
    if (!state) return null;
    return state.scenarios.find((s) => s.id === state.activeScenarioId) ?? state.scenarios[0] ?? null;
  }, [state]);

  // Segment + chip filtering happens on the plain account list, independent of
  // any scenario — so the same filtered set of accounts can be re-resolved
  // against the active scenario (for the chart/headline/goal) and against
  // every other scenario (for the comparison ghost lines) alike.
  const visibleAccountsRaw = useMemo<Account[]>(() => {
    if (!state) return [];
    return segment === "together" ? state.accounts : state.accounts.filter((a) => a.ownerId === segment);
  }, [state, segment]);

  const activeAccountsRaw = useMemo(
    () => visibleAccountsRaw.filter((a) => !excluded.has(a.id)),
    [visibleAccountsRaw, excluded],
  );

  const visibleAccounts = useMemo<ScenarioAccount[]>(
    () => (activeScenario ? visibleAccountsRaw.map((a) => withScenarioContribution(a, activeScenario)) : []),
    [visibleAccountsRaw, activeScenario],
  );

  const activeAccounts = useMemo(
    () => visibleAccounts.filter((a) => !excluded.has(a.id)),
    [visibleAccounts, excluded],
  );

  const perAccountSeries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof projectAccount>>();
    for (const a of visibleAccounts) map.set(a.id, projectAccount(a, months));
    return map;
  }, [visibleAccounts, months]);

  const zeroSeries = useMemo<AggregatePoint[]>(
    () => Array.from({ length: months + 1 }, (_, t) => ({ t, contributed: 0, growth: 0, total: 0 })),
    [months],
  );

  const activeAggregateNominal = useMemo<AggregatePoint[]>(() => {
    if (activeAccounts.length === 0) return zeroSeries;
    return aggregateSeries(activeAccounts.map((a) => perAccountSeries.get(a.id)!));
  }, [activeAccounts, perAccountSeries, zeroSeries]);

  const showRealDollars = state?.assumptions.showRealDollars ?? false;
  const inflationPct = state?.assumptions.inflationPct ?? 0;

  const activeAggregateDisplay = useMemo(
    () => (showRealDollars ? toRealDollars(activeAggregateNominal, inflationPct) : activeAggregateNominal),
    [activeAggregateNominal, showRealDollars, inflationPct],
  );

  // Other scenarios, re-resolved over the same filtered account set, for the
  // thin comparison lines on the chart.
  const scenarioSeries = useMemo(() => {
    if (!state) return [];
    return state.scenarios
      .filter((s) => s.id !== state.activeScenarioId)
      .map((s) => {
        const resolved = activeAccountsRaw.map((a) => withScenarioContribution(a, s));
        const nominal = resolved.length ? aggregateSeries(resolved.map((a) => projectAccount(a, months))) : zeroSeries;
        const display = showRealDollars ? toRealDollars(nominal, inflationPct) : nominal;
        return { id: s.id, name: s.name, color: s.color, series: display };
      });
  }, [state, activeAccountsRaw, months, zeroSeries, showRealDollars, inflationPct]);

  const scenarioLines = useMemo(
    () => scenarioSeries.map((s) => ({ id: s.id, name: s.name, color: s.color })),
    [scenarioSeries],
  );

  const goal = state?.goal ?? null;
  const targetMonths = goal ? monthsUntil(goal.targetDate, now) : null;
  const goalDateValid = targetMonths !== null && validateGoalDate(targetMonths) === null;
  const goalAmountValid = goal !== null && validateGoalAmount(goal.amount) === null;

  const goalResult = useMemo(() => {
    if (!state || !goal || !goalDateValid || !goalAmountValid || !activeScenario) return null;
    const scenarioAccounts = state.accounts.map((a) => withScenarioContribution(a, activeScenario));
    return solveGoal(scenarioAccounts, state.people, goal, targetMonths as number, months);
  }, [state, goal, goalDateValid, goalAmountValid, activeScenario, targetMonths, months]);

  const displayGoalAmount = useMemo(() => {
    if (!goal || targetMonths === null) return null;
    return showRealDollars ? deflate(goal.amount, targetMonths, inflationPct) : goal.amount;
  }, [goal, targetMonths, showRealDollars, inflationPct]);

  const goalCrossing = useMemo(() => {
    if (!goalResult || displayGoalAmount === null) return null;
    const series = showRealDollars
      ? toRealDollars(goalResult.currentPaceSeries, inflationPct)
      : goalResult.currentPaceSeries;
    return findCrossing(series, displayGoalAmount);
  }, [goalResult, displayGoalAmount, showRealDollars, inflationPct]);

  const displayRequiredSeries = useMemo(() => {
    if (!goalResult?.requiredSeries) return null;
    return showRealDollars ? toRealDollars(goalResult.requiredSeries, inflationPct) : goalResult.requiredSeries;
  }, [goalResult, showRealDollars, inflationPct]);

  const chartData = useMemo<ChartDatum[]>(
    () =>
      activeAggregateDisplay.map((point, i) => ({
        t: point.t,
        contributed: point.contributed,
        growth: point.growth,
        total: point.total,
        requiredTotal: displayRequiredSeries?.[i]?.total,
        scenarios: scenarioSeries.length
          ? Object.fromEntries(scenarioSeries.map((s) => [s.id, s.series[i]?.total ?? 0]))
          : undefined,
      })),
    [activeAggregateDisplay, displayRequiredSeries, scenarioSeries],
  );

  function personColor(personId: string): string {
    if (!state) return "var(--growth)";
    return state.people[0]?.id === personId ? "var(--person-1)" : "var(--person-2)";
  }

  const { growthColor, contributedColor } = useMemo(() => {
    if (segment === "together" || !state) {
      return { growthColor: "var(--growth)", contributedColor: "var(--contributed)" };
    }
    const color = state.people[0]?.id === segment ? "var(--person-1)" : "var(--person-2)";
    return { growthColor: color, contributedColor: `color-mix(in srgb, ${color} 22%, var(--contributed))` };
  }, [segment, state]);

  if (!state) {
    return <div className="min-h-screen bg-paper" />;
  }

  const horizonPoint = chartData[months];
  const headlineTotal = hoverDatum?.total ?? horizonPoint?.total ?? 0;
  const headlineContributed = hoverDatum?.contributed ?? horizonPoint?.contributed ?? 0;
  const headlineGrowth = hoverDatum?.growth ?? horizonPoint?.growth ?? 0;
  const headlineLabel = hoverDatum
    ? `${formatFromNow(hoverDatum.t)} · ${formatMonthYear(addMonths(now, hoverDatum.t))}`
    : formatFromNow(months);

  function handleSegmentChange(next: Segment) {
    setSegment(next);
    setExcluded(new Set());
  }

  function handleAddAccount(): string {
    const id = nanoid();
    updateState((prev) => ({
      ...prev,
      accounts: [
        ...prev.accounts,
        {
          id,
          name: "",
          ownerId: prev.people[0].id,
          type: "other",
          balance: 0,
          annualReturnPct: 7,
          annualIncreasePct: 0,
        },
      ],
      scenarios: addAccountToScenarios(prev.scenarios, id, 0),
    }));
    return id;
  }

  function handleContributionChange(accountId: string, value: number) {
    updateState((prev) => ({
      ...prev,
      scenarios: prev.scenarios.map((s) =>
        s.id === prev.activeScenarioId ? { ...s, contributions: { ...s.contributions, [accountId]: value } } : s,
      ),
    }));
  }

  function handleAddScenario() {
    const id = nanoid();
    updateState((prev) => {
      const current = prev.scenarios.find((s) => s.id === prev.activeScenarioId) ?? prev.scenarios[0];
      const next = createScenario(id, `Scenario ${prev.scenarios.length + 1}`, prev.scenarios.length, prev.accounts, current);
      return { ...prev, scenarios: [...prev.scenarios, next], activeScenarioId: next.id };
    });
    setJustAddedScenarioId(id);
  }

  function handleRenameScenario(id: string, name: string) {
    updateState((prev) => ({
      ...prev,
      scenarios: prev.scenarios.map((s) => (s.id === id ? { ...s, name } : s)),
    }));
  }

  function handleDeleteScenario(id: string) {
    updateState((prev) => {
      const remaining = prev.scenarios.filter((s) => s.id !== id);
      if (remaining.length === 0) return prev;
      const activeScenarioId = prev.activeScenarioId === id ? remaining[0].id : prev.activeScenarioId;
      return { ...prev, scenarios: remaining, activeScenarioId };
    });
  }

  return (
    <div className="mx-auto w-full max-w-[1240px] px-6 min-[900px]:px-12">
      <Header
        showRealDollars={showRealDollars}
        onToggleRealDollars={(v) =>
          updateState((prev) => ({ ...prev, assumptions: { ...prev.assumptions, showRealDollars: v } }))
        }
        status={status}
      />

      {conflict && (
        <div className="pb-4">
          <ConflictBar onLoadTheirVersion={loadTheirVersion} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 pb-16 min-[900px]:grid-cols-[1fr_360px]">
        <section className="flex flex-col gap-4">
          <Headline
            label={headlineLabel}
            total={headlineTotal}
            contributed={headlineContributed}
            growth={headlineGrowth}
          />

          <SavingsChart
            data={chartData}
            horizonMonths={months}
            growthColor={growthColor}
            contributedColor={contributedColor}
            empty={activeAccounts.length === 0}
            goal={
              goal && goalCrossing && displayGoalAmount !== null
                ? { label: goal.label, amount: displayGoalAmount, crossing: goalCrossing }
                : null
            }
            scenarioLines={scenarioLines}
            onHoverChange={setHoverDatum}
            startYear={now.getFullYear()}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl people={state.people} value={segment} onChange={handleSegmentChange} />
            <HorizonSlider
              value={state.assumptions.horizonYears}
              onChange={(years) =>
                updateState((prev) => ({ ...prev, assumptions: { ...prev.assumptions, horizonYears: years } }))
              }
            />
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {visibleAccounts.map((a) => (
              <AccountChip
                key={a.id}
                name={a.name || "Untitled"}
                monthlyContribution={a.monthlyContribution}
                color={personColor(a.ownerId)}
                active={!excluded.has(a.id)}
                onToggle={() =>
                  setExcluded((prev) => {
                    const next = new Set(prev);
                    if (next.has(a.id)) next.delete(a.id);
                    else next.add(a.id);
                    return next;
                  })
                }
              />
            ))}
          </div>
        </section>

        <aside className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="label-utility">Scenarios</p>
            <ScenarioSwitcher
              scenarios={state.scenarios}
              activeScenarioId={state.activeScenarioId}
              onSelect={(id) => updateState((prev) => ({ ...prev, activeScenarioId: id }))}
              onRename={handleRenameScenario}
              onDelete={handleDeleteScenario}
              onAdd={handleAddScenario}
              autoRenameId={justAddedScenarioId}
            />
          </div>

          <AccountsList
            accounts={state.accounts}
            people={state.people}
            contributions={activeScenario?.contributions ?? {}}
            onContributionChange={handleContributionChange}
            onAccountChange={(id, updater) =>
              updateState((prev) => ({
                ...prev,
                accounts: prev.accounts.map((a) => (a.id === id ? updater(a) : a)),
              }))
            }
            onAddAccount={handleAddAccount}
            onDeleteAccount={(id) =>
              updateState((prev) => ({
                ...prev,
                accounts: prev.accounts.filter((a) => a.id !== id),
                scenarios: removeAccountFromScenarios(prev.scenarios, id),
              }))
            }
            ownerColor={personColor}
          />

          <GoalPanel
            goal={goal}
            people={state.people}
            accounts={state.accounts}
            goalResult={goalResult}
            crossing={goalCrossing}
            displayGoalAmount={displayGoalAmount}
            targetMonths={targetMonths}
            now={now}
            onSetGoal={(g) => updateState((prev) => ({ ...prev, goal: g }))}
            onUpdateGoal={(updater) =>
              updateState((prev) => (prev.goal ? { ...prev, goal: updater(prev.goal) } : prev))
            }
            onClearGoal={() => updateState((prev) => ({ ...prev, goal: null }))}
          />
        </aside>
      </div>
    </div>
  );
}
