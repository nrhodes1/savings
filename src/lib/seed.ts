import { nanoid } from "nanoid";
import type { Account, HouseholdState, Scenario } from "./types";
import { SCENARIO_COLORS } from "./scenarioColors";

export function seedState(): HouseholdState {
  const p1 = nanoid();
  const p2 = nanoid();

  const a1 = nanoid();
  const a2 = nanoid();
  const a3 = nanoid();
  const a4 = nanoid();

  const accounts: Account[] = [
    {
      id: a1,
      name: "401(k)",
      ownerId: p1,
      type: "401k",
      balance: 65_000,
      annualReturnPct: 7,
      annualIncreasePct: 2,
    },
    {
      id: a2,
      name: "Brokerage",
      ownerId: p1,
      type: "brokerage",
      balance: 18_000,
      annualReturnPct: 7,
      annualIncreasePct: 0,
    },
    {
      id: a3,
      name: "401(k)",
      ownerId: p2,
      type: "401k",
      balance: 52_000,
      annualReturnPct: 7,
      annualIncreasePct: 2,
    },
    {
      id: a4,
      name: "High-yield savings",
      ownerId: p2,
      type: "savings",
      balance: 24_000,
      annualReturnPct: 4,
      annualIncreasePct: 0,
    },
  ];

  const baseline: Scenario = {
    id: nanoid(),
    name: "Baseline",
    color: SCENARIO_COLORS[0],
    contributions: {
      [a1]: 1_200,
      [a2]: 400,
      [a3]: 1_000,
      [a4]: 300,
    },
  };

  return {
    version: 1,
    people: [
      { id: p1, name: "Partner 1" },
      { id: p2, name: "Partner 2" },
    ],
    accounts,
    scenarios: [baseline],
    activeScenarioId: baseline.id,
    assumptions: {
      horizonYears: 20,
      inflationPct: 2.5,
      showRealDollars: false,
    },
    goal: null,
  };
}
