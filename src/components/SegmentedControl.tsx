"use client";

export type Segment = "together" | string;

type SegmentedControlProps = {
  people: { id: string; name: string }[];
  value: Segment;
  onChange: (value: Segment) => void;
};

export function SegmentedControl({ people, value, onChange }: SegmentedControlProps) {
  const options: { key: Segment; label: string }[] = [
    { key: "together", label: "Together" },
    ...people.map((p) => ({ key: p.id, label: p.name })),
  ];

  return (
    <div
      role="tablist"
      aria-label="View"
      className="inline-flex items-center gap-0.5 rounded-full bg-surface-sunk p-1"
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.key)}
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
