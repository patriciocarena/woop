/**
 * Recovery scoring — pure functions.
 *
 * Combines four signals against a personal rolling baseline (28-day window):
 *   • HRV (higher = better)        — heaviest weight
 *   • Resting HR (lower = better)
 *   • Sleep performance (0..100)   — feeds in pre-computed
 *   • Respiratory rate (deviation = warning)
 *
 * Each signal becomes a 0..100 sub-score via z-score, then weighted.
 * Until the user has at least MIN_BASELINE_SAMPLES days of history,
 * we return zone="calibrating" and a heuristic mid-band score.
 */

export const BASELINE_WINDOW_DAYS = 28;
export const MIN_BASELINE_SAMPLES = 4;

export type Baseline = { mean: number; std: number; n: number };

export type RecoveryInputs = {
  hrv: number;
  rhr: number;
  respiratoryRate?: number;
  sleepPerformance?: number; // 0..100, last night's sleep
  baselines: {
    hrv: Baseline;
    rhr: Baseline;
    respiratory?: Baseline;
  };
};

export type RecoveryZone = "low" | "mid" | "high" | "calibrating";

export type Recovery = {
  score: number; // 0..100
  zone: RecoveryZone;
  parts: {
    hrv: number;          // 0..100
    rhr: number;          // 0..100
    sleep: number;        // 0..100
    respiratory: number;  // 0..100
  };
};

const WEIGHTS = { hrv: 0.5, rhr: 0.25, sleep: 0.15, respiratory: 0.1 } as const;

export function computeRecovery({
  hrv,
  rhr,
  respiratoryRate,
  sleepPerformance,
  baselines,
}: RecoveryInputs): Recovery {
  const calibrating =
    baselines.hrv.n < MIN_BASELINE_SAMPLES || baselines.rhr.n < MIN_BASELINE_SAMPLES;

  // Higher HRV vs baseline → positive z is good.
  const hrvSub = zToScore(zScore(hrv, baselines.hrv));
  // Lower RHR vs baseline → negate the z so lower wins.
  const rhrSub = zToScore(-zScore(rhr, baselines.rhr));
  // Sleep already 0..100; if missing assume neutral 60.
  const sleepSub = sleepPerformance ?? 60;
  // Respiratory deviation: any large move (up or down) is bad. Default neutral 70.
  const respSub =
    respiratoryRate !== undefined && baselines.respiratory
      ? zToScore(-Math.abs(zScore(respiratoryRate, baselines.respiratory)))
      : 70;

  const blended =
    WEIGHTS.hrv * hrvSub +
    WEIGHTS.rhr * rhrSub +
    WEIGHTS.sleep * sleepSub +
    WEIGHTS.respiratory * respSub;

  const score = round1(clamp(blended, 0, 100));

  return {
    score,
    zone: calibrating ? "calibrating" : zoneFor(score),
    parts: {
      hrv: round1(hrvSub),
      rhr: round1(rhrSub),
      sleep: round1(sleepSub),
      respiratory: round1(respSub),
    },
  };
}

/** Whoop-style: red <34, yellow 34..66, green ≥67. */
export function zoneFor(score: number): RecoveryZone {
  if (score < 34) return "low";
  if (score < 67) return "mid";
  return "high";
}

/**
 * Build a rolling baseline from the most recent N days of values.
 * Returns mean and (population) standard deviation, plus the sample count.
 */
export function computeBaseline(values: number[], window = BASELINE_WINDOW_DAYS): Baseline {
  const sample = values.slice(-window);
  if (sample.length === 0) return { mean: 0, std: 1, n: 0 };
  const mean = sample.reduce((a, b) => a + b, 0) / sample.length;
  const variance =
    sample.reduce((a, b) => a + (b - mean) * (b - mean), 0) / sample.length;
  // Floor std at a meaningful minimum so single-sample baselines don't explode.
  const std = Math.max(Math.sqrt(variance), Math.max(mean * 0.02, 0.5));
  return { mean, std, n: sample.length };
}

// ─── helpers ────────────────────────────────────────────────────────────
function zScore(value: number, b: Baseline): number {
  return (value - b.mean) / b.std;
}

/** Map a z-score to 0..100. z=0 → 50; z=±3.33 → 0/100. */
function zToScore(z: number): number {
  return clamp(50 + z * 15, 0, 100);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi);
}
function round1(v: number) {
  return Math.round(v * 10) / 10;
}
