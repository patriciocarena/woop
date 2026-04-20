/**
 * Sleep scoring — pure functions, all inputs in minutes / 0..1 ratios.
 * Tuned to feel like Whoop's published methodology without claiming to replicate it.
 *
 * Two functions matter:
 *   • computeSleepNeed   — how much you "needed" tonight
 *   • computeSleepPerformance — how well you did vs that need
 */

const MIN_PER_HOUR = 60;
const BASELINE_NEED_MIN = 8 * MIN_PER_HOUR; // 480 — adult default

export type SleepNeedInputs = {
  /** Personal baseline override in minutes (defaults to 480 = 8h). */
  baselineMin?: number;
  /** Sum of (need - asleep) over the last 7 nights, in minutes. Negative → surplus. */
  sleepDebtMin?: number;
  /** Yesterday's strain on the 0..21 Borg scale. Higher strain → more need. */
  strainYesterday?: number;
  /** Total nap minutes today (reduce nightly need). */
  napMin?: number;
};

/**
 * Returns target sleep for tonight in minutes, clamped to [5h, 11h].
 * Strain bonus: ~6 extra minutes per strain point above 10 (Whoop-ish).
 * Debt: 50 % of accumulated debt is added back tonight.
 * Naps: subtracted 1:1 (with diminishing returns past 60 min).
 */
export function computeSleepNeed({
  baselineMin = BASELINE_NEED_MIN,
  sleepDebtMin = 0,
  strainYesterday = 0,
  napMin = 0,
}: SleepNeedInputs): number {
  const strainBonus = Math.max(0, strainYesterday - 10) * 6;
  const debtRecovery = Math.max(0, sleepDebtMin) * 0.5;
  const napCredit = Math.min(napMin, 60) + Math.max(0, napMin - 60) * 0.5;

  const raw = baselineMin + strainBonus + debtRecovery - napCredit;
  return clamp(raw, 5 * MIN_PER_HOUR, 11 * MIN_PER_HOUR);
}

export type SleepPerformanceInputs = {
  /** Minutes actually asleep last night. */
  asleepMin: number;
  /** Sleep need for last night (use computeSleepNeed). */
  needMin: number;
  /** Minutes in bed (asleep + awake). Used to compute efficiency. */
  timeInBedMin: number;
  /**
   * Bedtime/wake-time consistency over the last 7 days, 0..1.
   *  1 = identical times every night, 0 = totally erratic.
   *  Pass undefined when you don't have enough history (we'll skip the penalty).
   */
  consistency?: number;
};

export type SleepPerformance = {
  /** Headline score 0..100. */
  score: number;
  /** Sub-components, each 0..100, surfaced in the UI breakdown. */
  parts: {
    duration: number;     // asleep / need
    efficiency: number;   // asleep / timeInBed
    consistency: number;  // 0..100 (or 100 if not enough history)
  };
};

/**
 * Weighted blend: 70 % duration, 20 % efficiency, 10 % consistency.
 * Whoop's exact weights aren't public, but duration dominates in their UI too.
 */
export function computeSleepPerformance({
  asleepMin,
  needMin,
  timeInBedMin,
  consistency,
}: SleepPerformanceInputs): SleepPerformance {
  const duration = clamp((asleepMin / Math.max(needMin, 1)) * 100, 0, 100);
  const efficiency = clamp((asleepMin / Math.max(timeInBedMin, 1)) * 100, 0, 100);
  const consistencyPct = consistency === undefined ? 100 : clamp(consistency * 100, 0, 100);

  const score = duration * 0.7 + efficiency * 0.2 + consistencyPct * 0.1;

  return {
    score: round1(score),
    parts: {
      duration: round1(duration),
      efficiency: round1(efficiency),
      consistency: round1(consistencyPct),
    },
  };
}

/**
 * Compute sleep debt over a window of recent sessions.
 * Returns sum of (need - asleep) where positive = under-slept.
 */
export function computeSleepDebt(sessions: { needMin: number; asleepMin: number }[]): number {
  return sessions.reduce((acc, s) => acc + Math.max(0, s.needMin - s.asleepMin), 0);
}

/**
 * Bedtime consistency: 1 - (stdev of bedtime offsets in minutes / 120).
 * Returns a value clamped to [0, 1]. Needs ≥ 3 sessions to be meaningful.
 */
export function computeConsistency(bedtimesMinutesOfDay: number[]): number | undefined {
  if (bedtimesMinutesOfDay.length < 3) return undefined;

  // Bedtimes can wrap around midnight; convert to circular coordinates.
  const radians = bedtimesMinutesOfDay.map((m) => (m / (24 * 60)) * 2 * Math.PI);
  const meanSin = mean(radians.map(Math.sin));
  const meanCos = mean(radians.map(Math.cos));
  const r = Math.sqrt(meanSin * meanSin + meanCos * meanCos); // 0..1, 1 = perfectly aligned
  return clamp(r, 0, 1);
}

// ─── helpers ─────────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi);
}
function round1(v: number) {
  return Math.round(v * 10) / 10;
}
function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
