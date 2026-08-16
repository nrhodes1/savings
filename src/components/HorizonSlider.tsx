"use client";

const SNAP_POINTS = [1, 2, 3, 5, 10, 15, 20, 25, 30, 35, 40];

function nearestSnap(value: number): number {
  return SNAP_POINTS.reduce((best, point) =>
    Math.abs(point - value) < Math.abs(best - value) ? point : best,
  );
}

type HorizonSliderProps = {
  value: number;
  onChange: (years: number) => void;
};

export function HorizonSlider({ value, onChange }: HorizonSliderProps) {
  const index = SNAP_POINTS.indexOf(nearestSnap(value));

  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={SNAP_POINTS.length - 1}
        step={1}
        value={index}
        onChange={(e) => onChange(SNAP_POINTS[Number(e.target.value)])}
        aria-label="Time horizon"
        aria-valuetext={`${value} years`}
        className="h-1 w-40 cursor-pointer accent-[var(--growth)]"
      />
      <span className="tnum text-[13px] text-ink-soft whitespace-nowrap">{value} yrs</span>
    </div>
  );
}
