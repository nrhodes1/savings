"use client";

type ConflictBarProps = {
  onLoadTheirVersion: () => void;
};

export function ConflictBar({ onLoadTheirVersion }: ConflictBarProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[6px] border border-rule bg-surface-sunk px-4 py-2 text-[13px]">
      <span className="text-ink-soft">These numbers changed on another device.</span>
      <button
        type="button"
        onClick={onLoadTheirVersion}
        className="shrink-0 font-medium text-ink hover:text-ink"
      >
        Load their version
      </button>
    </div>
  );
}
