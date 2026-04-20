/**
 * Trend helpers — turn raw store data into chart-ready series.
 *
 * Everything here is pure: takes arrays in, returns arrays out, no React,
 * no store access. The components in /trends pull from the relevant Zustand
 * stores and feed into these functions.
 */

import { rollingMean, mean } from "./stats";

export type DailyPoint = {
  date: string;     // YYYY-MM-DD
  value: number;
  ma7?: number;     // 7-day rolling mean (filled in by addRollingMean)
};

/**
 * Build a continuous N-day series ending today, filling missing dates with
 * `fillValue` (default 0). This is what charts want — not a sparse array
 * with gaps that Recharts would render as straight diagonals.
 */
export function buildDailySeries({
  days,
  byDate,
  fillValue = 0,
  endDate = todayStr(),
}: {
  days: number;
  byDate: Map<string, number>;
  fillValue?: number;
  endDate?: string;
}): DailyPoint[] {
  const out: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(`${endDate}T00:00:00`);
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    out.push({ date, value: byDate.get(date) ?? fillValue });
  }
  return out;
}

export function addRollingMean(series: DailyPoint[], window: number): DailyPoint[] {
  const ma = rollingMean(series.map((p) => p.value), window);
  return series.map((p, i) => ({ ...p, ma7: ma[i] }));
}

/** Average over a window. Skips zeros if `excludeZeros` is true (useful for sparse stores). */
export function averageOver(
  series: DailyPoint[],
  opts: { excludeZeros?: boolean } = {},
): number {
  const values = opts.excludeZeros ? series.filter((p) => p.value > 0).map((p) => p.value) : series.map((p) => p.value);
  return mean(values);
}

/** Group a series into weekly buckets (Mon..Sun) returning per-week averages. */
export function weeklyAverages(series: DailyPoint[]): { weekStart: string; avg: number; count: number }[] {
  const buckets = new Map<string, number[]>();
  for (const p of series) {
    if (p.value === 0) continue;
    const key = mondayOf(p.date);
    const arr = buckets.get(key) ?? [];
    arr.push(p.value);
    buckets.set(key, arr);
  }
  return [...buckets.entries()]
    .map(([weekStart, values]) => ({ weekStart, avg: mean(values), count: values.length }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

/** Returns YYYY-MM-DD of the Monday in the same week as the given date. */
export function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const dow = d.getDay(); // 0 = Sun
  const diff = (dow + 6) % 7; // days back to Monday
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
