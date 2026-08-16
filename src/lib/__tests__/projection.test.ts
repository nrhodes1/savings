import { describe, expect, it } from "vitest";
import { aggregateSeries, projectAccount, toRealDollars } from "../projection";
import type { Account } from "../types";

function account(overrides: Partial<Account> = {}): Account {
  return {
    id: "a",
    name: "Test",
    ownerId: "p1",
    type: "brokerage",
    balance: 0,
    annualReturnPct: 0,
    monthlyContribution: 0,
    annualIncreasePct: 0,
    ...overrides,
  };
}

describe("projectAccount — acceptance criteria", () => {
  it("A. single account, one year", () => {
    const series = projectAccount(
      account({ balance: 10_000, annualReturnPct: 7, monthlyContribution: 500 }),
      12,
    );
    const last = series[12];
    expect(last.balance).toBeCloseTo(16_890, 0);
    expect(last.contributed).toBeCloseTo(16_000, 0);
    expect(last.growth).toBeCloseTo(890, 0);
  });

  it("B. real dollars deflates the nominal total", () => {
    const series = projectAccount(
      account({ balance: 10_000, annualReturnPct: 7, monthlyContribution: 500 }),
      12,
    );
    const agg = aggregateSeries([series]);
    const real = toRealDollars(agg, 3);
    expect(real[12].total).toBeCloseTo(16_398, 0);
  });

  it("D. annual increase compounds contributions yearly, not returns", () => {
    const series = projectAccount(
      account({ balance: 0, annualReturnPct: 0, monthlyContribution: 100, annualIncreasePct: 10 }),
      24,
    );
    const last = series[24];
    expect(last.contributed).toBeCloseTo(2_520, 0);
    expect(last.growth).toBeCloseTo(0, 0);
  });
});

describe("invariants over randomized inputs (E)", () => {
  function randomAccount(): Account {
    return account({
      balance: Math.random() * 200_000,
      annualReturnPct: Math.random() * 15,
      monthlyContribution: Math.random() * 2_000,
      annualIncreasePct: Math.random() * 10,
    });
  }

  it("holds for 25 random trials of 3 accounts each", () => {
    for (let trial = 0; trial < 25; trial++) {
      const accounts = [randomAccount(), randomAccount(), randomAccount()];
      const months = 60;
      const seriesList = accounts.map((a) => projectAccount(a, months));
      const agg = aggregateSeries(seriesList);

      for (let t = 0; t <= months; t++) {
        const expectedContributed = accounts.reduce((sum, a) => sum + a.balance, 0);
        // contributed_t must equal the sum of each account's own contributed_t
        const perAccountContributed = seriesList.reduce((sum, s) => sum + s[t].contributed, 0);
        expect(agg[t].contributed).toBeCloseTo(perAccountContributed, 6);
        expect(agg[t].contributed).toBeGreaterThanOrEqual(expectedContributed - 1e-6);

        // total = contributed + growth at every month
        expect(agg[t].total).toBeCloseTo(agg[t].contributed + agg[t].growth, 6);

        // growth is non-negative when all returns are >= 0
        expect(agg[t].growth).toBeGreaterThanOrEqual(-1e-6);

        // aggregating equals the sum of individual series
        const sumTotal = seriesList.reduce((sum, s) => sum + s[t].balance, 0);
        expect(agg[t].total).toBeCloseTo(sumTotal, 6);

        if (t > 0) {
          expect(agg[t].contributed).toBeGreaterThanOrEqual(agg[t - 1].contributed - 1e-6);
          expect(agg[t].total).toBeGreaterThanOrEqual(agg[t - 1].total - 1e-6);
        }
      }
    }
  });
});
