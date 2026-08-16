"use client";

import { useId, useState } from "react";

type InfoTooltipProps = {
  label: string;
  children: React.ReactNode;
};

/** A small "i" glyph that reveals an explanatory tooltip on hover or keyboard focus. */
export function InfoTooltip({ label, children }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-describedby={tooltipId}
        aria-label={label}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="flex h-[14px] w-[14px] items-center justify-center rounded-full border border-ink-faint text-[10px] leading-none text-ink-faint hover:border-ink-soft hover:text-ink-soft"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          id={tooltipId}
          className="pointer-events-none absolute top-full right-0 z-20 mt-2 w-56 rounded-[6px] border border-rule bg-surface px-3 py-2 text-[12px] leading-snug text-ink-soft shadow-[var(--shadow-card)]"
        >
          {children}
        </span>
      )}
    </span>
  );
}
