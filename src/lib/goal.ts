import type { Account, Goal, GoalScope, Person } from "./types";
import { aggregateSeries, monthlyRate, projectAccount, type AggregatePoint } from "./projection";

export function inScopeAccounts(accounts: Account[], scope: GoalScope): Account[] {
  switch (scope.kind) {
    case "household":
      return accounts;
    case "person":
      return accounts.filter((a) => a.ownerId === scope.id);
    case "account":
      return accounts.filter((a) => a.id === scope.id);
  }
}

export type PerPersonDelta = { personId: string; delta: number };

export type GoalSolution =
  | { status: "no-accounts" }
  | { status: "already-there" }
  | { status: "on-track"; requiredMonthly: number; currentMonthly: number; delta: number }
  | {
      status: "behind";
      requiredMonthly: number;
      currentMonthly: number;
      delta: number;
      perPerson: PerPersonDelta[];
    }
  | { status: "flat"; requiredMonthly: number };

export type GoalResult = {
  solution: GoalSolution;
  /** Nominal, over `horizonMonths`, at current (unscaled) contribution levels — for crossing detection. */
  currentPaceSeries: AggregatePoint[];
  /** Nominal, over `horizonMonths`, the "required pace" ghost curve. Null when there's nothing to chase. */
  requiredSeries: AggregatePoint[] | null;
};

/**
 * Solves for the monthly contribution needed to hit `goal.amount` by
 * `goal.targetDate`. Future value is affine in a uniform scale factor `k`
 * applied to all in-scope monthly contributions, so no iteration is needed —
 * see savings-projection-spec.md §5.1.
 *
 * Everything here operates in nominal dollars (contributions are literal
 * paycheck amounts). `targetMonths` is the goal's own horizon (now ->
 * targetDate), used to solve for `k`. `horizonMonths` is the chart's display
 * horizon — the caller re-expresses `currentPaceSeries`/`requiredSeries` in
 * real dollars and finds the crossing there if the real-dollars toggle is on.
 */
export function solveGoal(
  accounts: Account[],
  people: Person[],
  goal: Goal,
  targetMonths: number,
  horizonMonths: number,
): GoalResult {
  const scoped = inScopeAccounts(accounts, goal.scope);
  if (scoped.length === 0) {
    return { solution: { status: "no-accounts" }, currentPaceSeries: [], requiredSeries: null };
  }

  const zeroedAtTarget = scoped.map((a) => projectAccount({ ...a, monthlyContribution: 0 }, targetMonths));
  const configuredAtTarget = scoped.map((a) => projectAccount(a, targetMonths));
  const currentPaceSeries = aggregateSeries(scoped.map((a) => projectAccount(a, horizonMonths)));

  const fvBalances = aggregateSeries(zeroedAtTarget)[targetMonths].total;
  const fvTotal = aggregateSeries(configuredAtTarget)[targetMonths].total;
  const fvContrib = fvTotal - fvBalances;

  const currentMonthly = scoped.reduce((sum, a) => sum + a.monthlyContribution, 0);

  if (fvBalances >= goal.amount) {
    return { solution: { status: "already-there" }, currentPaceSeries, requiredSeries: null };
  }

  if (fvContrib === 0) {
    const { requiredMonthly, effectiveAnnualReturnPct } = solveFlatMonthly(
      scoped,
      goal.amount - fvBalances,
      targetMonths,
    );
    const zeroedAtHorizon = scoped.map((a) => projectAccount({ ...a, monthlyContribution: 0 }, horizonMonths));
    const virtual = projectAccount(
      { balance: 0, annualReturnPct: effectiveAnnualReturnPct, monthlyContribution: requiredMonthly, annualIncreasePct: 0 },
      horizonMonths,
    );
    const requiredSeries = aggregateSeries([...zeroedAtHorizon, virtual]);
    return { solution: { status: "flat", requiredMonthly }, currentPaceSeries, requiredSeries };
  }

  const k = (goal.amount - fvBalances) / fvContrib;
  const requiredMonthly = k * currentMonthly;
  const delta = requiredMonthly - currentMonthly;
  const scaledAtHorizon = scoped.map((a) =>
    projectAccount({ ...a, monthlyContribution: a.monthlyContribution * k }, horizonMonths),
  );
  const requiredSeries = aggregateSeries(scaledAtHorizon);

  if (k <= 1) {
    return {
      solution: { status: "on-track", requiredMonthly, currentMonthly, delta },
      currentPaceSeries,
      requiredSeries,
    };
  }

  const perPerson: PerPersonDelta[] = people.map((person) => {
    const personMonthly = scoped
      .filter((a) => a.ownerId === person.id)
      .reduce((sum, a) => sum + a.monthlyContribution, 0);
    const share = currentMonthly > 0 ? personMonthly / currentMonthly : 0;
    return { personId: person.id, delta: delta * share };
  });

  return {
    solution: { status: "behind", requiredMonthly, currentMonthly, delta, perPerson },
    currentPaceSeries,
    requiredSeries,
  };
}

/** Standard ordinary-annuity solve, used when no contributions are in scope. */
function solveFlatMonthly(
  scoped: Account[],
  remaining: number,
  months: number,
): { requiredMonthly: number; effectiveAnnualReturnPct: number } {
  const totalBalance = scoped.reduce((sum, a) => sum + a.balance, 0);
  const effectiveAnnualReturnPct =
    totalBalance > 0
      ? scoped.reduce((sum, a) => sum + a.balance * a.annualReturnPct, 0) / totalBalance
      : scoped.reduce((sum, a) => sum + a.annualReturnPct, 0) / scoped.length;

  const r_m = monthlyRate(effectiveAnnualReturnPct);
  const annuityFactor = r_m !== 0 ? (Math.pow(1 + r_m, months) - 1) / r_m : months;
  const requiredMonthly = annuityFactor === 0 ? 0 : remaining / annuityFactor;
  return { requiredMonthly, effectiveAnnualReturnPct };
}
