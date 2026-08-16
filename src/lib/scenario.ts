import type { Account, Scenario, ScenarioAccount } from "./types";
import { colorForScenarioIndex } from "./scenarioColors";

export function contributionFor(scenario: Scenario, accountId: string): number {
  return scenario.contributions[accountId] ?? 0;
}

export function withScenarioContribution(account: Account, scenario: Scenario): ScenarioAccount {
  return { ...account, monthlyContribution: contributionFor(scenario, account.id) };
}

export function resolveScenarioAccounts(accounts: Account[], scenario: Scenario): ScenarioAccount[] {
  return accounts.map((a) => withScenarioContribution(a, scenario));
}

/** New scenario, seeded from `copyFrom`'s numbers if given (a "duplicate and tweak" starting point). */
export function createScenario(
  id: string,
  name: string,
  scenarioCount: number,
  accounts: Account[],
  copyFrom?: Scenario,
): Scenario {
  const contributions: Record<string, number> = {};
  for (const a of accounts) contributions[a.id] = copyFrom ? contributionFor(copyFrom, a.id) : 0;
  return { id, name, color: colorForScenarioIndex(scenarioCount), contributions };
}

/** Keeps every scenario's contributions map in sync when an account is added. */
export function addAccountToScenarios(scenarios: Scenario[], accountId: string, initialValue = 0): Scenario[] {
  return scenarios.map((s) => ({ ...s, contributions: { ...s.contributions, [accountId]: initialValue } }));
}

/** Keeps every scenario's contributions map in sync when an account is deleted. */
export function removeAccountFromScenarios(scenarios: Scenario[], accountId: string): Scenario[] {
  return scenarios.map((s) => {
    const rest = { ...s.contributions };
    delete rest[accountId];
    return { ...s, contributions: rest };
  });
}
