"use client";

import type { Account, Goal, GoalScope, Person } from "@/lib/types";
import type { GoalResult } from "@/lib/goal";
import type { Crossing } from "@/lib/projection";
import { addMonths, formatMonthYear, monthsToYearsMonths } from "@/lib/date";
import { formatCurrency, formatMonthlyDelta } from "@/lib/format";
import { validateGoalAmount, validateGoalDate } from "@/lib/validation";
import { defaultGoal } from "@/lib/goalDefaults";
import { NumberField } from "./fields/NumberField";

type GoalPanelProps = {
  goal: Goal | null;
  people: Person[];
  accounts: Account[];
  goalResult: GoalResult | null;
  crossing: Crossing | null;
  displayGoalAmount: number | null;
  targetMonths: number | null;
  now: Date;
  onSetGoal: (goal: Goal) => void;
  onUpdateGoal: (updater: (g: Goal) => Goal) => void;
  onClearGoal: () => void;
};

function scopeKey(scope: GoalScope): string {
  if (scope.kind === "household") return "household";
  return `${scope.kind}:${scope.id}`;
}

function parseScopeKey(key: string): GoalScope {
  if (key === "household") return { kind: "household" };
  const [kind, id] = key.split(":");
  return kind === "person" ? { kind: "person", id } : { kind: "account", id };
}

export function GoalPanel({
  goal,
  people,
  accounts,
  goalResult,
  crossing,
  displayGoalAmount,
  targetMonths,
  now,
  onSetGoal,
  onUpdateGoal,
  onClearGoal,
}: GoalPanelProps) {
  if (!goal) {
    return (
      <div className="rounded-[10px] bg-surface-sunk px-4 py-3">
        <button
          type="button"
          onClick={() => onSetGoal(defaultGoal(now))}
          className="flex items-center gap-2 text-[15px] text-ink-soft hover:text-ink"
        >
          <TargetIcon />
          Set a goal
        </button>
      </div>
    );
  }

  const amountError = validateGoalAmount(goal.amount);
  const dateError = targetMonths !== null ? validateGoalDate(targetMonths) : null;

  return (
    <div className="flex flex-col gap-3 rounded-[10px] bg-surface-sunk px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="label-utility">Goal</p>
        <select
          value={scopeKey(goal.scope)}
          onChange={(e) =>
            onUpdateGoal((g) => ({ ...g, scope: parseScopeKey(e.target.value) }))
          }
          aria-label="Goal scope"
          className="rounded-[6px] bg-transparent text-[13px] text-ink-soft outline-none"
        >
          <option value="household">Household</option>
          {people.map((p) => (
            <option key={p.id} value={`person:${p.id}`}>
              {p.name}
            </option>
          ))}
          {accounts.map((a) => (
            <option key={a.id} value={`account:${a.id}`}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="goal-label" className="label-utility mb-1 block">
          Label
        </label>
        <input
          id="goal-label"
          type="text"
          value={goal.label}
          onChange={(e) => onUpdateGoal((g) => ({ ...g, label: e.target.value }))}
          className="w-full rounded-[6px] border border-rule bg-surface px-3 py-2 text-[15px] text-ink outline-none focus-visible:outline-2 focus-visible:outline-growth"
        />
      </div>

      <NumberField
        id="goal-amount"
        label="Target amount"
        value={goal.amount}
        onChange={(v) => onUpdateGoal((g) => ({ ...g, amount: v }))}
        format={formatCurrency}
        step={1000}
        min={0}
        error={amountError}
      />

      <div>
        <label htmlFor="goal-date" className="label-utility mb-1 block">
          Target date
        </label>
        <input
          id="goal-date"
          type="month"
          value={goal.targetDate}
          min={`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`}
          onChange={(e) => onUpdateGoal((g) => ({ ...g, targetDate: e.target.value }))}
          className="tnum w-full rounded-[6px] border border-rule bg-surface px-3 py-2 text-[15px] text-ink outline-none focus-visible:outline-2 focus-visible:outline-growth"
        />
        {dateError && (
          <p role="alert" className="mt-1 text-[13px] text-warn">
            {dateError}
          </p>
        )}
      </div>

      {!amountError && !dateError && goalResult && crossing && displayGoalAmount !== null && (
        <GoalReadout
          people={people}
          goalResult={goalResult}
          crossing={crossing}
          displayGoalAmount={displayGoalAmount}
          targetMonths={targetMonths as number}
          now={now}
        />
      )}

      <button
        type="button"
        onClick={onClearGoal}
        className="self-start text-[13px] text-ink-faint hover:text-warn"
      >
        Remove goal
      </button>
    </div>
  );
}

function GoalReadout({
  people,
  goalResult,
  crossing,
  displayGoalAmount,
  targetMonths,
  now,
}: {
  people: Person[];
  goalResult: GoalResult;
  crossing: Crossing;
  displayGoalAmount: number;
  targetMonths: number;
  now: Date;
}) {
  const { solution } = goalResult;
  const targetDateLabel = formatMonthYear(addMonths(now, targetMonths));

  if (solution.status === "no-accounts") {
    return <p className="text-[13px] text-ink-soft">Add an account in scope to solve for this goal.</p>;
  }

  if (solution.status === "already-there") {
    return (
      <div className="pt-1">
        <p className="font-display tnum text-[20px] text-ink">$0/mo</p>
        <p className="text-[13px] text-ink-soft">
          You&apos;re already there on existing balances alone.
        </p>
      </div>
    );
  }

  const deltaColor = solution.status === "flat" ? undefined : solution.delta > 0 ? "var(--warn)" : "var(--growth)";

  return (
    <div className="flex flex-col gap-1 pt-1">
      <p className="font-display tnum text-[20px] text-ink">{formatCurrency(solution.requiredMonthly)}/mo</p>
      <p className="text-[13px] text-ink-soft">
        to reach {formatCurrency(displayGoalAmount)} by {targetDateLabel}
      </p>

      {solution.status !== "flat" && (
        <p className="text-[13px] text-ink-soft">
          That&apos;s{" "}
          <span className="tnum font-medium" style={{ color: deltaColor }}>
            {formatMonthlyDelta(solution.delta)}
          </span>{" "}
          {solution.delta > 0 ? "more" : "less"} than you&apos;re saving now
          {solution.status === "behind" &&
            solution.perPerson.length > 0 &&
            " — " +
              solution.perPerson
                .map((pp) => `${formatCurrency(Math.abs(pp.delta))} from ${people.find((p) => p.id === pp.personId)?.name ?? ""}`)
                .join(", ")}
          .
        </p>
      )}

      <p className="mt-1 text-[13px] text-ink-soft">
        {crossing.reached
          ? (() => {
              const { years, months } = monthsToYearsMonths(crossing.monthsFromNow);
              const dateLabel = formatMonthYear(addMonths(now, crossing.monthsFromNow));
              return (
                <>
                  At your current pace you&apos;d reach {formatCurrency(displayGoalAmount)} in{" "}
                  <span className="font-medium text-ink">{dateLabel}</span>
                  {crossing.monthsFromNow !== targetMonths && (
                    <> — {formatDelayLabel(crossing.monthsFromNow - targetMonths)}</>
                  )}
                  .
                  <span className="sr-only">
                    {" "}
                    ({years} years, {months} months from now)
                  </span>
                </>
              );
            })()
          : "At your current pace, not within the horizon shown."}
      </p>
    </div>
  );
}

function formatDelayLabel(diffMonths: number): string {
  const late = diffMonths > 0;
  const { years, months } = monthsToYearsMonths(Math.abs(diffMonths));
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? "" : "s"}`);
  if (months > 0) parts.push(`${months} month${months === 1 ? "" : "s"}`);
  const span = parts.join(", ") || "0 months";
  return `${span} ${late ? "later" : "earlier"} than your target`;
}

function TargetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="0.75" fill="currentColor" />
    </svg>
  );
}
