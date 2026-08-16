"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useElementSize } from "@/hooks/useElementSize";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { makeLinearScale, niceTicks, yearTicks } from "@/lib/chartScale";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { formatFromNow } from "@/lib/date";
import type { Crossing } from "@/lib/projection";

export type ChartDatum = {
  t: number;
  contributed: number;
  growth: number;
  total: number;
  requiredTotal?: number;
};

export type GoalOverlay = {
  label: string;
  amount: number;
  crossing: Crossing;
};

type SavingsChartProps = {
  data: ChartDatum[];
  horizonMonths: number;
  growthColor: string;
  contributedColor: string;
  empty: boolean;
  goal?: GoalOverlay | null;
  onHoverChange?: (datum: ChartDatum | null) => void;
  startYear: number;
};

const MARGIN = { top: 24, right: 140, bottom: 8, left: 8 };
const Y_AXIS_WIDTH = 60;
const X_AXIS_HEIGHT = 24;

export function SavingsChart({
  data,
  horizonMonths,
  growthColor,
  contributedColor,
  empty,
  goal,
  onHoverChange,
  startYear,
}: SavingsChartProps) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const reducedMotion = usePrefersReducedMotion();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setHasMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const maxValue = useMemo(() => {
    let max = 0;
    for (const d of data) {
      max = Math.max(max, d.total, d.requiredTotal ?? 0);
    }
    if (goal) max = Math.max(max, goal.amount);
    return max;
  }, [data, goal]);

  const yTicks = useMemo(() => niceTicks(maxValue * 1.05, 5), [maxValue]);
  const yMax = yTicks[yTicks.length - 1] ?? 1;
  const xTicks = useMemo(() => yearTicks(horizonMonths, 6), [horizonMonths]);

  const plotLeft = MARGIN.left + Y_AXIS_WIDTH;
  const plotRight = size.width - MARGIN.right;
  const plotTop = MARGIN.top;
  const plotBottom = size.height - MARGIN.bottom - X_AXIS_HEIGHT;

  const scaleX = useMemo(
    () => makeLinearScale([0, horizonMonths], [plotLeft, plotRight]),
    [horizonMonths, plotLeft, plotRight],
  );
  const scaleY = useMemo(
    () => makeLinearScale([0, yMax], [plotBottom, plotTop]),
    [yMax, plotBottom, plotTop],
  );

  const activeIndex = hoverIndex ?? horizonMonths;
  const activeDatum = data[activeIndex];

  useEffect(() => {
    onHoverChange?.(hoverIndex !== null ? data[hoverIndex] : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverIndex]);

  useEffect(() => {
    if (hoverIndex === null) return;
    function handlePointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setHoverIndex(null);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [hoverIndex]);

  function handleMove(state: { activeTooltipIndex?: unknown; isTooltipActive?: boolean }) {
    if (!state?.isTooltipActive) return;
    const idx = Number(state.activeTooltipIndex);
    if (Number.isFinite(idx)) setHoverIndex(idx);
  }

  const ready = size.width > 0 && size.height > 0;
  const animationDuration = reducedMotion ? 0 : hasMounted ? 350 : 500;

  return (
    <div className="w-full" ref={wrapperRef}>
      <div ref={ref} className="relative w-full" style={{ height: 420 }}>
        {ready && (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={MARGIN}
                onMouseMove={handleMove}
                onTouchStart={handleMove}
                onTouchMove={handleMove}
                onMouseLeave={() => setHoverIndex(null)}
              >
                <defs>
                  <linearGradient id="growthFade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={growthColor} stopOpacity={1} />
                    <stop offset="94%" stopColor={growthColor} stopOpacity={1} />
                    <stop offset="100%" stopColor={growthColor} stopOpacity={0.94} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  horizontal
                  vertical={false}
                  stroke="var(--rule)"
                  strokeWidth={1}
                />

                <XAxis
                  dataKey="t"
                  type="number"
                  domain={[0, horizonMonths]}
                  ticks={xTicks}
                  height={X_AXIS_HEIGHT}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
                  tickFormatter={(t: number) => String(startYear + Math.round(t / 12))}
                />
                <YAxis
                  type="number"
                  domain={[0, yMax]}
                  ticks={yTicks}
                  width={Y_AXIS_WIDTH}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
                  tickFormatter={(v: number) => formatCompactCurrency(v)}
                />

                <Tooltip content={() => null} cursor={false} isAnimationActive={false} />

                <Area
                  dataKey="contributed"
                  stackId="stack"
                  stroke="none"
                  fill={contributedColor}
                  fillOpacity={1}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={!reducedMotion}
                  animationDuration={animationDuration}
                />
                <Area
                  dataKey="growth"
                  stackId="stack"
                  stroke="none"
                  fill="url(#growthFade)"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={!reducedMotion}
                  animationDuration={animationDuration}
                />

                {goal && (
                  <>
                    <ReferenceLine
                      y={goal.amount}
                      stroke="var(--pace)"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      label={{
                        value: goal.label,
                        position: "insideBottomLeft",
                        fill: "var(--pace)",
                        fontSize: 11,
                      }}
                    />
                    <Line
                      dataKey="requiredTotal"
                      stroke="var(--pace)"
                      strokeOpacity={0.45}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={false}
                      activeDot={false}
                      isAnimationActive={!reducedMotion}
                      animationDuration={reducedMotion ? 0 : 600}
                    />
                    {goal.crossing.reached && goal.crossing.monthsFromNow <= horizonMonths && (
                      <ReferenceDot
                        x={goal.crossing.monthsFromNow}
                        y={goal.amount}
                        r={5}
                        shape={DiamondDot}
                      />
                    )}
                  </>
                )}

                {hoverIndex !== null && (
                  <ReferenceLine
                    x={hoverIndex}
                    stroke="var(--ink)"
                    strokeOpacity={0.25}
                    strokeWidth={1}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>

            {/* Manual overlay: hover dot, tooltip, and the growth wedge — all sharing one self-computed scale. */}
            <svg
              className="pointer-events-none absolute inset-0"
              width={size.width}
              height={size.height}
              aria-hidden="true"
            >
              {hoverIndex !== null && activeDatum && (
                <circle
                  cx={scaleX(activeDatum.t)}
                  cy={scaleY(activeDatum.total)}
                  r={4}
                  fill="var(--ink)"
                />
              )}
              {activeDatum && (
                <GrowthWedge
                  x={plotRight + 14}
                  yTop={scaleY(activeDatum.total)}
                  yBottom={scaleY(activeDatum.contributed)}
                  color={growthColor}
                  amount={activeDatum.growth}
                  width={MARGIN.right - 24}
                />
              )}
            </svg>

            {hoverIndex !== null && activeDatum && (
              <div
                className="pointer-events-none absolute z-10 rounded-[6px] border border-rule bg-surface px-3 py-2 text-[12px] shadow-[var(--shadow-card)]"
                style={{
                  left: Math.min(Math.max(scaleX(activeDatum.t) + 12, 0), size.width - 168),
                  top: Math.max(scaleY(activeDatum.total) - 88, 0),
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <p className="mb-1 text-ink-soft">{formatFromNow(activeDatum.t)}</p>
                <dl className="grid grid-cols-[auto_auto] gap-x-3 tnum text-right">
                  <dt className="text-left text-ink-soft">Total</dt>
                  <dd className="text-ink">{formatCurrency(activeDatum.total)}</dd>
                  <dt className="text-left text-ink-soft">Contributed</dt>
                  <dd className="text-ink">{formatCurrency(activeDatum.contributed)}</dd>
                  <dt className="text-left text-ink-soft">Growth</dt>
                  <dd className="text-ink">{formatCurrency(activeDatum.growth)}</dd>
                </dl>
              </div>
            )}

            {empty && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <p className="text-[15px] text-ink-faint">No accounts selected.</p>
              </div>
            )}
          </>
        )}
      </div>

      <AccessibleTable data={data} horizonMonths={horizonMonths} startYear={startYear} />
    </div>
  );
}

function DiamondDot({ cx, cy }: { cx?: number; cy?: number }) {
  if (cx === undefined || cy === undefined) return <g />;
  const r = 5;
  return (
    <polygon
      points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
      fill="var(--pace)"
      stroke="var(--surface)"
      strokeWidth={1}
    />
  );
}

function GrowthWedge({
  x,
  yTop,
  yBottom,
  color,
  amount,
  width,
}: {
  x: number;
  yTop: number;
  yBottom: number;
  color: string;
  amount: number;
  width: number;
}) {
  const bracketWidth = 8;
  const mid = (yTop + yBottom) / 2;
  return (
    <g>
      <path
        d={`M ${x + bracketWidth} ${yTop} L ${x} ${yTop} L ${x} ${yBottom} L ${x + bracketWidth} ${yBottom}`}
        fill="none"
        stroke={color}
        strokeWidth={1}
      />
      <foreignObject x={x + bracketWidth + 4} y={mid - 16} width={width} height={32}>
        <div className="tnum text-[12px] leading-tight" style={{ color }}>
          +{formatCurrency(amount)}
          <br />
          <span className="text-ink-faint">from returns</span>
        </div>
      </foreignObject>
    </g>
  );
}

function AccessibleTable({
  data,
  horizonMonths,
  startYear,
}: {
  data: ChartDatum[];
  horizonMonths: number;
  startYear: number;
}) {
  const rows = [];
  for (let months = 0; months <= horizonMonths; months += 60) {
    const d = data[months];
    if (!d) continue;
    rows.push(d);
  }
  const last = data[horizonMonths];
  if (last && rows[rows.length - 1] !== last) rows.push(last);

  return (
    <table className="sr-only">
      <caption>Projected savings at five-year marks</caption>
      <thead>
        <tr>
          <th scope="col">Year</th>
          <th scope="col">Contributed</th>
          <th scope="col">Growth</th>
          <th scope="col">Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((d) => (
          <tr key={d.t}>
            <td>{startYear + Math.round(d.t / 12)}</td>
            <td>{formatCurrency(d.contributed)}</td>
            <td>{formatCurrency(d.growth)}</td>
            <td>{formatCurrency(d.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
