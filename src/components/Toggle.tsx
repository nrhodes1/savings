"use client";

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
};

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-[13px] text-ink-soft"
    >
      <span>{label}</span>
      <span
        className={`relative inline-flex h-[18px] w-[32px] shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-growth" : "bg-rule"
        }`}
      >
        <span
          className={`inline-block h-[14px] w-[14px] transform rounded-full bg-surface shadow-sm transition-transform ${
            checked ? "translate-x-[16px]" : "translate-x-[2px]"
          }`}
        />
      </span>
    </button>
  );
}
