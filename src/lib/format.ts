const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const currencyFormatterCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

/** "$84,200" */
export function formatCurrency(amount: number): string {
  return currencyFormatter.format(Math.round(amount));
}

/** "$84,200.00" — used for input fields on blur. */
export function formatCurrencyPrecise(amount: number): string {
  return currencyFormatterCents.format(amount);
}

/** "$450k" / "$1.2M" — compact axis labels. */
export function formatCompactCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    return `${sign}$${trimZero((abs / 1_000_000).toFixed(1))}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${trimZero((abs / 1_000).toFixed(0))}k`;
  }
  return `${sign}$${Math.round(abs)}`;
}

function trimZero(s: string): string {
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

/** "+$212/mo" / "-$85/mo" */
export function formatMonthlyDelta(amount: number): string {
  const sign = amount >= 0 ? "+" : "-";
  return `${sign}${formatCurrency(Math.abs(amount))}/mo`;
}

export function formatPercent(pct: number): string {
  return `${pct.toFixed(1)}%`;
}
