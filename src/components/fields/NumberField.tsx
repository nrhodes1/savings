"use client";

import { useState } from "react";

type NumberFieldProps = {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  step: number;
  min?: number;
  max?: number;
  error?: string | null;
  autoFocus?: boolean;
};

export function NumberField({
  id,
  label,
  value,
  onChange,
  format,
  step,
  min = -Infinity,
  max = Infinity,
  error,
  autoFocus,
}: NumberFieldProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() => String(value));

  const displayText = focused ? draft : format(value);

  function clamp(n: number) {
    return Math.min(max, Math.max(min, n));
  }

  function handleChange(next: string) {
    setDraft(next);
    const parsed = Number(next.replace(/[^0-9.-]/g, ""));
    if (!Number.isNaN(parsed)) onChange(parsed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const delta = e.key === "ArrowUp" ? step : -step;
      const next = clamp(Math.round((value + delta) * 100) / 100);
      onChange(next);
      setDraft(String(next));
    }
  }

  return (
    <div>
      <label htmlFor={id} className="label-utility mb-1 block">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoFocus={autoFocus}
        value={displayText}
        onFocus={() => {
          setFocused(true);
          setDraft(String(value));
        }}
        onBlur={() => setFocused(false)}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="tnum w-full rounded-[6px] border border-rule bg-surface-sunk px-3 py-2 text-[15px] text-ink outline-none focus-visible:outline-2 focus-visible:outline-growth"
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-[13px] text-warn">
          {error}
        </p>
      )}
    </div>
  );
}
