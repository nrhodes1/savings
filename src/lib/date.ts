const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Whole months between `from` and a 'YYYY-MM' target date. Can be negative. */
export function monthsUntil(targetDate: string, from: Date): number {
  const [ty, tm] = targetDate.split("-").map(Number);
  const fy = from.getFullYear();
  const fm = from.getMonth() + 1;
  return (ty - fy) * 12 + (tm - fm);
}

/** Adds `months` whole months to `from` and returns the resulting Date. */
export function addMonths(from: Date, months: number): Date {
  return new Date(from.getFullYear(), from.getMonth() + months, 1);
}

/** Formats a Date as "Mar 2034". */
export function formatMonthYear(date: Date): string {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Splits a month count into whole years and remainder months. */
export function monthsToYearsMonths(months: number): { years: number; months: number } {
  const years = Math.floor(months / 12);
  return { years, months: months - years * 12 };
}

/** "In 6 years, 4 months" / "In 8 months" / "Today". */
export function formatFromNow(months: number): string {
  if (months <= 0) return "Today";
  const { years, months: rem } = monthsToYearsMonths(months);
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? "" : "s"}`);
  if (rem > 0) parts.push(`${rem} month${rem === 1 ? "" : "s"}`);
  return `In ${parts.join(", ")}`;
}
