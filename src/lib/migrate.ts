import { nanoid } from "nanoid";
import type { HouseholdState, Scenario } from "./types";
import { SCENARIO_COLORS } from "./scenarioColors";

type LegacyAccount = { id: string; monthlyContribution?: number };

/** The shape a persisted row might be in: current, or pre-scenarios legacy. */
type StoredState = Omit<HouseholdState, "accounts" | "scenarios" | "activeScenarioId"> & {
  accounts: LegacyAccount[];
  scenarios?: Scenario[];
  activeScenarioId?: string;
};

/**
 * Scenarios shipped after the initial release — older persisted rows have
 * `monthlyContribution` inline on each account and no `scenarios` array.
 * Folds that into a single "Baseline" scenario so old data keeps working.
 */
export function normalizeHouseholdState(raw: StoredState): HouseholdState {
  if (raw.scenarios && raw.activeScenarioId) {
    return raw as HouseholdState;
  }

  const contributions: Record<string, number> = {};
  const accounts = raw.accounts.map((a) => {
    contributions[a.id] = a.monthlyContribution ?? 0;
    const rest: LegacyAccount = { ...a };
    delete rest.monthlyContribution;
    return rest;
  });

  const baseline: Scenario = {
    id: nanoid(),
    name: "Baseline",
    color: SCENARIO_COLORS[0],
    contributions,
  };

  return {
    ...raw,
    accounts: accounts as HouseholdState["accounts"],
    scenarios: [baseline],
    activeScenarioId: baseline.id,
  };
}
