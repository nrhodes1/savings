export type HouseholdState = {
  version: 1;
  people: Person[]; // exactly 2
  accounts: Account[];
  scenarios: Scenario[]; // at least 1
  activeScenarioId: string;
  assumptions: Assumptions;
  goal: Goal | null; // one goal at a time
};

export type Person = {
  id: string; // nanoid
  name: string; // editable, defaults "Partner 1" / "Partner 2"
};

export type AccountType =
  | "brokerage"
  | "401k"
  | "roth-ira"
  | "traditional-ira"
  | "hsa"
  | "savings"
  | "other";

export type Account = {
  id: string;
  name: string; // e.g. "Fidelity 401(k)"
  ownerId: string; // Person.id
  type: AccountType;
  balance: number; // current, USD
  annualReturnPct: number; // e.g. 7 means 7%
  annualIncreasePct: number; // contribution raise each year, default 0
};

/**
 * A named what-if set of monthly contributions. Balance, return, and annual
 * increase live on the Account itself — only the monthly contribution amount
 * varies per scenario. `contributions` holds one entry per account.
 */
export type Scenario = {
  id: string;
  name: string;
  color: string; // fixed categorical hex, assigned at creation from lib/scenarioColors
  contributions: Record<string, number>; // Account.id -> monthlyContribution (USD)
};

/** An Account with its monthly contribution resolved from a specific scenario. */
export type ScenarioAccount = Account & { monthlyContribution: number };

export type Assumptions = {
  horizonYears: number; // 1-40, default 20
  inflationPct: number; // default 2.5
  showRealDollars: boolean; // default false
};

export type GoalScope =
  | { kind: "household" }
  | { kind: "person"; id: string }
  | { kind: "account"; id: string };

export type Goal = {
  amount: number;
  targetDate: string; // 'YYYY-MM'
  label: string; // e.g. "House down payment", default "Our goal"
  scope: GoalScope;
};
