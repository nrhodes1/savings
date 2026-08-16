"use client";

import { useEffect, useRef, useState } from "react";

export type Segment = "together" | string;

type SegmentedControlProps = {
  people: { id: string; name: string }[];
  value: Segment;
  onChange: (value: Segment) => void;
  onRename: (personId: string, name: string) => void;
};

export function SegmentedControl({ people, value, onChange, onRename }: SegmentedControlProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const options: { key: Segment; label: string; renamable: boolean }[] = [
    { key: "together", label: "Together", renamable: false },
    ...people.map((p) => ({ key: p.id, label: p.name, renamable: true })),
  ];

  return (
    <div
      role="tablist"
      aria-label="View"
      className="inline-flex items-center gap-0.5 rounded-full bg-surface-sunk p-1"
    >
      {options.map((opt) => {
        const active = value === opt.key;

        if (opt.renamable && renamingId === opt.key) {
          return (
            <RenameField
              key={opt.key}
              initialValue={opt.label}
              onCommit={(name) => {
                onRename(opt.key, name);
                setRenamingId(null);
              }}
              onCancel={() => setRenamingId(null)}
            />
          );
        }

        return (
          <button
            key={opt.key}
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (active && opt.renamable) {
                setRenamingId(opt.key);
              } else {
                onChange(opt.key);
              }
            }}
            className={`rounded-full px-3 py-1.5 text-[13px] transition-colors ${
              active ? "bg-surface text-ink shadow-sm font-medium" : "text-ink-soft"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function RenameField({
  initialValue,
  onCommit,
  onCancel,
}: {
  initialValue: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={initialValue}
      onBlur={(e) => (e.target.value.trim() ? onCommit(e.target.value.trim()) : onCancel())}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") onCancel();
      }}
      className="w-20 rounded-full bg-surface px-3 py-1.5 text-[13px] font-medium text-ink shadow-sm outline-none"
    />
  );
}
