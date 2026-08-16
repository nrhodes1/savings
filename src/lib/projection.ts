import type { Account } from "./types";

export type MonthPoint = {
  t: number; // months from now, 0-indexed
  balance: number;
  contributed: number;
  growth: number;
};

export type AggregatePoint = {
  t: number;
  contributed: number;
  growth: number;
  total: number;
};

type ProjectableAccount = Pick<
  Account,
  "balance" | "annualReturnPct" | "monthlyContribution" | "annualIncreasePct"
>;

/** Geometric monthly rate from a nominal annual percentage. */
export function monthlyRate(annualReturnPct: number): number {
  return Math.pow(1 + annualReturnPct / 100, 1 / 12) - 1;
}

/**
 * Month-by-month simulation for a single account, months 0..months inclusive.
 * Contributions land at the end of the month (ordinary annuity).
 */
export function projectAccount(
  account: ProjectableAccount,
  months: number,
): MonthPoint[] {
  const r_m = monthlyRate(account.annualReturnPct);
  const points: MonthPoint[] = new Array(months + 1);

  let balance = account.balance;
  let contributed = account.balance;
  points[0] = { t: 0, balance, contributed, growth: balance - contributed };

  for (let t = 1; t <= months; t++) {
    const contribution =
      account.monthlyContribution *
      Math.pow(1 + account.annualIncreasePct / 100, Math.floor((t - 1) / 12));
    balance = balance * (1 + r_m) + contribution;
    contributed += contribution;
    points[t] = { t, balance, contributed, growth: balance - contributed };
  }

  return points;
}

/**
 * Sums per-account series into one series. Filtering (which accounts to
 * include) always happens by choosing which series to pass in here, never
 * by re-running the simulation on blended inputs.
 */
export function aggregateSeries(seriesList: MonthPoint[][]): AggregatePoint[] {
  if (seriesList.length === 0) return [];
  const months = seriesList[0].length;
  const result: AggregatePoint[] = new Array(months);

  for (let i = 0; i < months; i++) {
    let contributed = 0;
    let growth = 0;
    for (const series of seriesList) {
      contributed += series[i].contributed;
      growth += series[i].growth;
    }
    result[i] = { t: seriesList[0][i].t, contributed, growth, total: contributed + growth };
  }

  return result;
}

export type Crossing = { reached: true; monthsFromNow: number } | { reached: false };

/** First month (in `series`, already in whichever units the caller wants compared) that reaches `amount`. */
export function findCrossing(series: AggregatePoint[], amount: number): Crossing {
  for (const point of series) {
    if (point.total >= amount) {
      return { reached: true, monthsFromNow: point.t };
    }
  }
  return { reached: false };
}

/** Deflates a nominal amount at month t to today's dollars. */
export function deflate(amount: number, t: number, inflationPct: number): number {
  return amount / Math.pow(1 + inflationPct / 100, t / 12);
}

/**
 * Converts an aggregated nominal series to real (today's) dollars.
 * Applied at the presentation layer, after aggregation — the underlying
 * model stays nominal.
 */
export function toRealDollars(
  points: AggregatePoint[],
  inflationPct: number,
): AggregatePoint[] {
  return points.map((p) => ({
    t: p.t,
    contributed: deflate(p.contributed, p.t, inflationPct),
    growth: deflate(p.growth, p.t, inflationPct),
    total: deflate(p.total, p.t, inflationPct),
  }));
}
