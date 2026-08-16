"use client";

import { formatCurrency } from "@/lib/format";

type AccountChipProps = {
  name: string;
  monthlyContribution: number;
  color: string;
  active: boolean;
  onToggle: () => void;
};

export function AccountChip({ name, monthlyContribution, color, active, onToggle }: AccountChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 text-[13px] transition-opacity ${
        active ? "opacity-100" : "opacity-40"
      }`}
    >
      <span aria-hidden="true" style={{ color }}>
        ◆
      </span>
      <span className="text-ink">{name}</span>
      <span className={`tnum text-ink-soft ${active ? "" : "line-through"}`}>
        {formatCurrency(monthlyContribution)}/mo
      </span>
    </button>
  );
}
