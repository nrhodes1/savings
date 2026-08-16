import { addMonths } from "./date";
import type { Goal } from "./types";

export function defaultTargetDate(from: Date): string {
  const d = addMonths(from, 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function defaultGoal(from: Date): Goal {
  return {
    amount: 0,
    targetDate: defaultTargetDate(from),
    label: "Our goal",
    scope: { kind: "household" },
  };
}
