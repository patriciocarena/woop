/**
 * Strain scoring — pure functions.
 *
 * Per workout we compute Banister's TRIMP (Training Impulse) using HR-reserve
 * intensity, then combine all workouts + an ambient baseline through a
 * saturating exponential into Whoop's familiar 0..21 Borg-style day strain.
 *
 * Tuning constants are picked so a "lazy day" sits ~6 and a hard interval
 * day pushes 14+. They aren't claimed to replicate Whoop exactly.
 */

import type { RecoveryZone } from "./recovery";

export const MAX_STRAIN = 21;

/**
 * Saturation constant in the TRIMP→strain mapping `21 * (1 − e^(−trimp/D))`.
 *
 * Why 180:
 *  • A "lazy day" (no workouts, ambient TRIMP ≈ 60) maps to ~6 strain.
 *  • A 60-min steady-state run (~340 TRIMP) maps to ~17 strain.
 *  • A 60-min walk (~70 TRIMP) maps to ~7 strain.
 * Lowering this number makes everything spike toward 21; raising it makes
 * even hard workouts read as moderate. Re-tune by re-running tests in
 * tests/unit/scoring/strain.test.ts which lock in the bands.
 */
export const STRAIN_DIVISOR = 180;

/**
 * Ambient daily TRIMP (steps + non-workout activity). 60 puts a rest day at
 * ~6 strain — matches Whoop's "Light" band for inactive days.
 */
export const DEFAULT_AMBIENT_TRIMP = 60;

/**
 * Defaults when the user has not set a personal max / resting HR.
 *  • DEFAULT_MAX_HR 190    ≈ 220 − 30y (population mean)
 *  • DEFAULT_RESTING_HR 60 — adult population mean
 * These should be overridden via ProfileSettings whenever possible.
 */
export const DEFAULT_MAX_HR = 190;
export const DEFAULT_RESTING_HR = 60;

export type Sport =
  | "run" | "walk" | "ride" | "lift" | "swim" | "yoga" | "hiit" | "sport" | "other";

export type WorkoutInput = {
  durationMin: number;
  /** Average HR during the workout. If undefined we fall back to RPE. */
  avgHr?: number;
  /** Personal max HR. Default 190 if unknown. */
  maxHr?: number;
  /** Personal resting HR. Default 60. */
  restingHr?: number;
  /** Borg 1..10 RPE. Used only when avgHr is missing. */
  perceivedRpe?: number;
  sport?: Sport;
};

/**
 * Banister TRIMP for a workout. Returns a positive number (zero if the
 * workout was at/below resting HR, which means it didn't really happen).
 *
 * If avgHr is missing we estimate intensity from RPE (1..10 → 0..1).
 */
export function workoutTRIMP({
  durationMin,
  avgHr,
  maxHr = DEFAULT_MAX_HR,
  restingHr = DEFAULT_RESTING_HR,
  perceivedRpe,
}: WorkoutInput): number {
  const intensity =
    avgHr !== undefined
      ? clamp((avgHr - restingHr) / Math.max(maxHr - restingHr, 1), 0, 1)
      : perceivedRpe !== undefined
        ? clamp(perceivedRpe / 10, 0, 1)
        : 0.4; // last-resort default = "moderate" if user logged nothing

  // Banister y(x): 0.64 * exp(1.92x). Higher intensity weighs much more.
  const y = 0.64 * Math.exp(1.92 * intensity);
  return Math.max(durationMin, 0) * intensity * y;
}

/** Single workout strain on 0..21 — useful for per-workout chips/lists. */
export function workoutStrain(workout: WorkoutInput): number {
  return mapTrimpToStrain(workoutTRIMP(workout));
}

/**
 * Day strain: combines all workout TRIMPs + an ambient baseline through a
 * saturating exponential. Doing two hard sessions stacks but with
 * diminishing returns — the curve naturally caps at 21.
 */
export function dayStrain({
  workouts,
  ambientTrimp = DEFAULT_AMBIENT_TRIMP,
}: {
  workouts: WorkoutInput[];
  ambientTrimp?: number;
}): number {
  const total = workouts.reduce((acc, w) => acc + workoutTRIMP(w), 0) + ambientTrimp;
  return mapTrimpToStrain(total);
}

function mapTrimpToStrain(trimp: number): number {
  const s = MAX_STRAIN * (1 - Math.exp(-trimp / STRAIN_DIVISOR));
  return round1(clamp(s, 0, MAX_STRAIN));
}

// ─── Strain Coach ───────────────────────────────────────────────────────
export type StrainTarget = {
  min: number;
  max: number;
  /** Short verb-phrase shown in the UI (e.g. "Push hard"). */
  label: string;
  /** One-line rationale that adapts to recovery. */
  rationale: string;
};

/**
 * Suggest a target day-strain band given today's recovery.
 * Defaults to a moderate band when recovery is missing or calibrating.
 */
export function suggestStrainTarget(
  recoveryScore: number | undefined,
  zone: RecoveryZone | undefined,
): StrainTarget {
  if (zone === "high") {
    return {
      min: 14,
      max: 19,
      label: "Push hard",
      rationale: "Green recovery — your body can absorb a meaningful training load today.",
    };
  }
  if (zone === "low") {
    return {
      min: 0,
      max: 8,
      label: "Easy day",
      rationale: "Red recovery — keep it aerobic and short, then prioritise sleep tonight.",
    };
  }
  if (zone === "mid") {
    return {
      min: 9,
      max: 14,
      label: "Moderate",
      rationale: "Yellow recovery — train, but pull back on top-end intensity.",
    };
  }
  return {
    min: 8,
    max: 13,
    label: "Default range",
    rationale: recoveryScore === undefined
      ? "Log a morning HRV reading so the coach can tailor today's target."
      : "Calibrating — using a moderate default band.",
  };
}

/** Translate a numeric strain into Whoop's 4-band label. */
export function strainBand(strain: number): "Light" | "Moderate" | "High" | "All Out" {
  if (strain < 10) return "Light";
  if (strain < 14) return "Moderate";
  if (strain < 18) return "High";
  return "All Out";
}

// ─── helpers ────────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi);
}
function round1(v: number) {
  return Math.round(v * 10) / 10;
}
