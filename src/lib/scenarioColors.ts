/**
 * Fixed categorical order for scenario identity colors. Validated against the
 * dataviz skill's six checks (light surface #F6F7F5): mutually distinct at
 * normal-vision ΔE >= 17.3 for every pair, and each clears the goal panel's
 * `--pace` dashed line (the one existing accent that can share a chart with
 * these) by >= 15. Never cycle past this list — cap scenario count instead.
 */
export const SCENARIO_COLORS = ["#9c72de", "#962d76", "#d95b7d", "#b18406"] as const;

export const MAX_SCENARIOS = SCENARIO_COLORS.length;

export function colorForScenarioIndex(index: number): string {
  return SCENARIO_COLORS[index % SCENARIO_COLORS.length];
}
