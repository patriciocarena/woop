/**
 * Recovery deltas — derive baseline + delta for HRV and RHR from a series of
 * RecoveryEntry records. Used by RecoveryRingStack (sub-rings) and
 * HrvBaselineChart (30-day trend with ±1σ band).
 *
 * Pure: takes raw entries, returns derived numbers, no React, no store.
 */

import { computeBaseline, type Baseline } from "@/lib/scoring/recovery";
import type { RecoveryEntry } from "@/lib/store/recovery";

export type SignalDelta = {
  current: number;
  baseline: Baseline;
  /** absolute delta vs baseline mean (current - mean). */
  delta: number;
  /** percentage delta vs baseline mean (0 if mean is 0). */
  deltaPct: number;
  /** z-score (current - mean) / std, capped at ±3 for display. */
  z: number;
};

export type RecoveryDeltas = {
  latest: RecoveryEntry;
  hrv: SignalDelta;
  rhr: SignalDelta;
};

export function computeRecoveryDeltas(entries: RecoveryEntry[]): RecoveryDeltas | null {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  // Baseline excludes the latest entry — it should compare today vs the past.
  const previous = sorted.slice(0, -1);
  return {
    latest,
    hrv: deltaFor(latest.hrv, previous.map((e) => e.hrv)),
    rhr: deltaFor(latest.rhr, previous.map((e) => e.rhr)),
  };
}

function deltaFor(current: number, history: number[]): SignalDelta {
  const baseline = computeBaseline(history);
  const delta = current - baseline.mean;
  const deltaPct = baseline.mean !== 0 ? (delta / baseline.mean) * 100 : 0;
  const rawZ = baseline.std !== 0 ? delta / baseline.std : 0;
  return { current, baseline, delta, deltaPct, z: clamp(rawZ, -3, 3) };
}

/**
 * Build a date-aligned HRV series for the last N days, including baseline mean
 * and ±1σ at each point (rolling baseline computed from prior entries).
 *
 * Returns one point per entry within the window — sparse, no day-fill, since
 * the chart only needs known readings.
 */
export type HrvBaselinePoint = {
  date: string;
  hrv: number;
  baseline: number;
  upper: number; // mean + 1σ
  lower: number; // mean - 1σ
  /** Tuple [lower, upper] used by Recharts range-area to shade the σ band. */
  bandRange: [number, number];
};

export function buildHrvBaselineSeries(
  entries: RecoveryEntry[],
  days = 30,
): HrvBaselinePoint[] {
  if (entries.length === 0) return [];
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const cutoff = cutoffDate(days);
  const out: HrvBaselinePoint[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    if (entry.date < cutoff) continue;
    // Rolling baseline from everything strictly before this entry.
    const history = sorted.slice(0, i).map((e) => e.hrv);
    const b = computeBaseline(history);
    const upper = round1(b.mean + b.std);
    const lower = round1(b.mean - b.std);
    out.push({
      date: entry.date,
      hrv: entry.hrv,
      baseline: round1(b.mean),
      upper,
      lower,
      bandRange: [lower, upper],
    });
  }
  return out;
}

function cutoffDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi);
}
function round1(v: number) {
  return Math.round(v * 10) / 10;
}
