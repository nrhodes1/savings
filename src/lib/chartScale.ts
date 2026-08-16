/** Rounds up to a "nice" step and returns evenly spaced ticks from 0 to a nice max. */
export function niceTicks(max: number, targetCount = 5): number[] {
  if (max <= 0) return [0, 1];

  const rawStep = max / (targetCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceNormalized * magnitude;

  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.5; v += step) {
    ticks.push(Math.round(v));
  }
  return ticks;
}

/** Sparse tick positions (in months) at year boundaries, ~targetCount of them. */
export function yearTicks(horizonMonths: number, targetCount = 6): number[] {
  const years = horizonMonths / 12;
  const stepYears = Math.max(1, Math.round(years / (targetCount - 1)));
  const ticks: number[] = [];
  for (let y = 0; y <= years; y += stepYears) {
    ticks.push(y * 12);
  }
  return ticks;
}

export function makeLinearScale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0);
}
