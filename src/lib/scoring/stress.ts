/**
 * Stress scoring — intra-day cardiovascular load variability.
 *
 * Whoop's real Stress Monitor is derived from overnight HRV and respiratory
 * rate (autonomic nervous system load). Without continuous wearable data we
 * approximate it from the Coefficient of Variation (CV) of all heart-rate
 * samples recorded during the day:
 *
 *   CV = (σ / μ) × 100   where σ = population stddev, μ = mean HR
 *
 * High CV means large swings between resting and peak HR — that pattern
 * correlates with a cardiovascularly demanding day (stress + exertion).
 * Low CV means HR stayed flat and calm all day.
 *
 * This is a heuristic, not a clinical measurement. We label it conservatively
 * as "cardiovascular load" in the UI and show the data source.
 *
 * Score scale  (matches Whoop's 1–3 display):
 *   1  Low       — CV < 10 %
 *   2  Moderate  — CV 10–20 %
 *   3  High      — CV > 20 %
 *
 * Requires ≥ 5 HR samples to be meaningful; returns null otherwise.
 */

export type StressLevel = 1 | 2 | 3;

export type StressResult = {
  /** 1 = Low, 2 = Moderate, 3 = High */
  score: StressLevel;
  /** Coefficient of variation in % (diagnostic / shown in detail view) */
  cv: number;
  /** Mean HR in bpm */
  meanHr: number;
  /** Number of readings used */
  sampleCount: number;
};

/** Minimum HR samples before we consider the result reliable. */
export const STRESS_MIN_SAMPLES = 5;

/** CV thresholds (%) separating Low / Moderate / High */
export const STRESS_CV_THRESHOLDS = { moderate: 10, high: 20 } as const;

/**
 * Compute stress level from a list of HR readings (bpm).
 * Returns null when there are fewer than STRESS_MIN_SAMPLES readings.
 */
export function computeStress(hrReadings: number[]): StressResult | null {
  if (hrReadings.length < STRESS_MIN_SAMPLES) return null;

  const n = hrReadings.length;
  const meanHr = hrReadings.reduce((a, b) => a + b, 0) / n;
  if (meanHr <= 0) return null;

  const variance = hrReadings.reduce((a, v) => a + (v - meanHr) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);
  const cv = (stddev / meanHr) * 100;

  const score: StressLevel =
    cv < STRESS_CV_THRESHOLDS.moderate ? 1
    : cv < STRESS_CV_THRESHOLDS.high ? 2
    : 3;

  return {
    score,
    cv: Math.round(cv * 10) / 10,
    meanHr: Math.round(meanHr),
    sampleCount: n,
  };
}

/**
 * Compute stress from running statistics (count / sum / sum-of-squares).
 * Used by the parser to avoid holding all HR values in memory.
 */
export function computeStressFromStats(stats: {
  count: number;
  sum: number;
  sumSq: number;
}): StressResult | null {
  const { count, sum, sumSq } = stats;
  if (count < STRESS_MIN_SAMPLES) return null;

  const meanHr = sum / count;
  if (meanHr <= 0) return null;

  const variance = sumSq / count - meanHr ** 2;
  const stddev = Math.sqrt(Math.max(0, variance));
  const cv = (stddev / meanHr) * 100;

  const score: StressLevel =
    cv < STRESS_CV_THRESHOLDS.moderate ? 1
    : cv < STRESS_CV_THRESHOLDS.high ? 2
    : 3;

  return {
    score,
    cv: Math.round(cv * 10) / 10,
    meanHr: Math.round(meanHr),
    sampleCount: count,
  };
}

export const STRESS_LABELS: Record<StressLevel, string> = {
  1: "Low",
  2: "Moderate",
  3: "High",
};

export const STRESS_COLORS: Record<StressLevel, string> = {
  1: "text-recovery-high",
  2: "text-recovery-mid",
  3: "text-recovery-low",
};

export const STRESS_BG_COLORS: Record<StressLevel, string> = {
  1: "bg-recovery-high/10 border-recovery-high/40",
  2: "bg-recovery-mid/10 border-recovery-mid/40",
  3: "bg-recovery-low/10 border-recovery-low/40",
};
