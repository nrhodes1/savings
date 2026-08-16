import { describe, expect, it } from "vitest";
import { solveGoal } from "../goal";
import type { Goal, Person, ScenarioAccount } from "../types";

const people: Person[] = [
  { id: "p1", name: "Alex" },
  { id: "p2", name: "Sam" },
];

describe("solveGoal — acceptance criteria", () => {
  it("C. solves for required monthly contribution", () => {
    const accounts: ScenarioAccount[] = [
      {
        id: "a1",
        name: "Test",
        ownerId: "p1",
        type: "brokerage",
        balance: 10_000,
        annualReturnPct: 7,
        monthlyContribution: 500,
        annualIncreasePct: 0,
      },
    ];
    const goal: Goal = {
      amount: 50_000,
      targetDate: "2031-01",
      label: "Test goal",
      scope: { kind: "household" },
    };

    const result = solveGoal(accounts, people, goal, 60, 60);
    expect(result.solution.status).toBe("behind");
    if (result.solution.status === "behind") {
      expect(result.solution.requiredMonthly).toBeCloseTo(505, 0);
      expect(result.solution.delta).toBeCloseTo(5, 0);
    }
  });

  it("already-there when existing balances alone clear the target", () => {
    const accounts: ScenarioAccount[] = [
      {
        id: "a1",
        name: "Test",
        ownerId: "p1",
        type: "brokerage",
        balance: 100_000,
        annualReturnPct: 7,
        monthlyContribution: 0,
        annualIncreasePct: 0,
      },
    ];
    const goal: Goal = {
      amount: 50_000,
      targetDate: "2031-01",
      label: "Test goal",
      scope: { kind: "household" },
    };
    const result = solveGoal(accounts, people, goal, 60, 60);
    expect(result.solution.status).toBe("already-there");
  });

  it("flat annuity solve when no contributions are in scope", () => {
    const accounts: ScenarioAccount[] = [
      {
        id: "a1",
        name: "Test",
        ownerId: "p1",
        type: "savings",
        balance: 1_000,
        annualReturnPct: 4,
        monthlyContribution: 0,
        annualIncreasePct: 0,
      },
    ];
    const goal: Goal = {
      amount: 50_000,
      targetDate: "2031-01",
      label: "Test goal",
      scope: { kind: "household" },
    };
    const result = solveGoal(accounts, people, goal, 60, 60);
    expect(result.solution.status).toBe("flat");
    if (result.solution.status === "flat") {
      expect(result.solution.requiredMonthly).toBeGreaterThan(0);
    }
  });

  it("no-accounts when scope matches nothing", () => {
    const goal: Goal = {
      amount: 50_000,
      targetDate: "2031-01",
      label: "Test goal",
      scope: { kind: "account", id: "missing" },
    };
    const result = solveGoal([], people, goal, 60, 60);
    expect(result.solution.status).toBe("no-accounts");
  });
});
