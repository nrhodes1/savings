export function validateBalance(value: number): string | null {
  if (!(value >= 0) || value > 1e9) return "Enter an amount of $0 or more.";
  return null;
}

export function validateAnnualReturn(value: number): string | null {
  if (!(value >= -20 && value <= 30)) return "Enter a return between −20% and 30%.";
  return null;
}

export function validateMonthlyContribution(value: number): string | null {
  if (!(value >= 0) || value > 1e6) return "Enter $0 or more.";
  return null;
}

export function validateAnnualIncrease(value: number): string | null {
  if (!(value >= 0 && value <= 25)) return "Enter between 0% and 25%.";
  return null;
}

export function validateAccountName(value: string): string | null {
  if (value.length < 1 || value.length > 40) return "Give this account a name.";
  return null;
}

export function validateGoalAmount(value: number): string | null {
  if (!(value > 0)) return "Enter a target amount.";
  return null;
}

export function validateGoalDate(monthsUntilTarget: number): string | null {
  if (monthsUntilTarget < 1) return "Pick a date at least one month out.";
  return null;
}
