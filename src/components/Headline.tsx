"use client";

import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { formatCurrency } from "@/lib/format";

type HeadlineProps = {
  label: string;
  total: number;
  contributed: number;
  growth: number;
};

export function Headline({ label, total, contributed, growth }: HeadlineProps) {
  const animatedTotal = useAnimatedNumber(total);

  return (
    <div>
      <p className="label-utility mb-1">{label}</p>
      <p className="font-display tnum text-[56px] leading-none text-ink">
        {formatCurrency(animatedTotal)}
      </p>
      <p className="mt-2 text-[15px] tnum text-ink-soft">
        {formatCurrency(contributed)} contributed · {formatCurrency(growth)} from returns
      </p>
    </div>
  );
}
