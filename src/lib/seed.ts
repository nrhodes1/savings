import { nanoid } from "nanoid";
import type { HouseholdState } from "./types";

export function seedState(): HouseholdState {
  const p1 = nanoid();
  const p2 = nanoid();

  return {
    version: 1,
    people: [
      { id: p1, name: "Partner 1" },
      { id: p2, name: "Partner 2" },
    ],
    accounts: [
      {
        id: nanoid(),
        name: "401(k)",
        ownerId: p1,
        type: "401k",
        balance: 65_000,
        annualReturnPct: 7,
        monthlyContribution: 1_200,
        annualIncreasePct: 2,
      },
      {
        id: nanoid(),
        name: "Brokerage",
        ownerId: p1,
        type: "brokerage",
        balance: 18_000,
        annualReturnPct: 7,
        monthlyContribution: 400,
        annualIncreasePct: 0,
      },
      {
        id: nanoid(),
        name: "401(k)",
        ownerId: p2,
        type: "401k",
        balance: 52_000,
        annualReturnPct: 7,
        monthlyContribution: 1_000,
        annualIncreasePct: 2,
      },
      {
        id: nanoid(),
        name: "High-yield savings",
        ownerId: p2,
        type: "savings",
        balance: 24_000,
        annualReturnPct: 4,
        monthlyContribution: 300,
        annualIncreasePct: 0,
      },
    ],
    assumptions: {
      horizonYears: 20,
      inflationPct: 2.5,
      showRealDollars: false,
    },
    goal: null,
  };
}
