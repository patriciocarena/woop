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

export type SleepStagesInput = {
  coreMin: number;
  deepMin: number;
  remMin: number;
  awakeMin: number;
};

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
  /** Per-stage breakdown — when present, awards a quality bonus for adequate Deep + REM. */
  stages?: SleepStagesInput;
};

export type SleepPerformance = {
  /** Headline score 0..100. */
  score: number;
  /** Sub-components, each 0..100, surfaced in the UI breakdown. */
  parts: {
    duration: number;     // asleep / need
    efficiency: number;   // asleep / timeInBed
    consistency: number;  // 0..100 (or 100 if not enough history)
    quality: number;      // 0..100 stage quality (100 if no stages info)
  };
};

/** Recommended-minimum thresholds (NSF/AASM-ish for adults). */
const DEEP_TARGET_MIN = 90;   // 1.5h deep
const REM_TARGET_MIN = 90;    // 1.5h REM

/**
 * Sleep stage quality, 0..100.
 *
 * Penalises shortfalls of Deep and REM against their targets, equally weighted.
 * If you hit both targets you get 100. Missing half of each → 50, etc. If we
 * don't know your stages (no Apple Watch / manual entry), we return 100 so
 * the overall performance score is unchanged.
 */
export function computeSleepQuality(stages: SleepStagesInput | undefined): number {
  if (!stages) return 100;
  const deepRatio = clamp(stages.deepMin / DEEP_TARGET_MIN, 0, 1);
  const remRatio = clamp(stages.remMin / REM_TARGET_MIN, 0, 1);
  return round1((deepRatio * 0.5 + remRatio * 0.5) * 100);
}

/**
 * Weighted blend, default (no stages):
 *   70 % duration · 20 % efficiency · 10 % consistency
 *
 * With stages present we re-weight to:
 *   55 % duration · 15 % efficiency · 10 % consistency · 20 % quality (Deep + REM)
 *
 * Whoop's exact weights aren't public, but duration dominates in their UI too,
 * and stage quality is one of the four breakdowns they surface.
 */
export function computeSleepPerformance({
  asleepMin,
  needMin,
  timeInBedMin,
  consistency,
  stages,
}: SleepPerformanceInputs): SleepPerformance {
  const duration = clamp((asleepMin / Math.max(needMin, 1)) * 100, 0, 100);
  const efficiency = clamp((asleepMin / Math.max(timeInBedMin, 1)) * 100, 0, 100);
  const consistencyPct = consistency === undefined ? 100 : clamp(consistency * 100, 0, 100);
  const quality = computeSleepQuality(stages);

  const score = stages
    ? duration * 0.55 + efficiency * 0.15 + consistencyPct * 0.10 + quality * 0.20
    : duration * 0.70 + efficiency * 0.20 + consistencyPct * 0.10;

  return {
    score: round1(score),
    parts: {
      duration: round1(duration),
      efficiency: round1(efficiency),
      consistency: round1(consistencyPct),
      quality: round1(quality),
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
