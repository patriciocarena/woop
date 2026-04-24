/**
 * Apple Health export parser.
 *
 * Apple exports a `export.zip` with `export.xml` inside. Users unzip it
 * (browsers can't unzip natively without a dep, and we want to stay tiny)
 * and upload `export.xml` directly.
 *
 * The file can be 10–200 MB. We use a streaming regex pass over records
 * rather than DOMParser (which would OOM on big exports). Each <Record/>
 * and <Workout/> element is a single line in practice.
 *
 * We extract:
 *   1. Sleep analysis  → one sleep session per calendar wake-date
 *                        (with REM/Deep/Core/Awake breakdown when available)
 *   2. HRV (SDNN)      → daily mean in ms
 *   3. Resting HR      → daily mean in bpm
 *   4. Workouts        → duration + sport (HR not on the <Workout> tag)
 *   5. Vitals (Phase 13):
 *        - SpO2 (%)
 *        - Sleeping wrist temperature delta (°C, from baseline)
 *        - Walking HR average (bpm)
 *
 * The parser is pure: it returns typed buckets. Applying to the stores lives
 * in a separate module so we can unit-test the parser without touching state.
 */

import type { Sport } from "@/lib/scoring/strain";
import { computeStressFromStats } from "@/lib/scoring/stress";

export type SleepStages = {
  /** "Asleep Core" / Light sleep, in minutes. */
  coreMin: number;
  /** Deep / SWS sleep, in minutes. */
  deepMin: number;
  /** REM sleep, in minutes. */
  remMin: number;
  /** Awake-during-night, in minutes. */
  awakeMin: number;
};

export type ParsedSleep = {
  date: string;          // YYYY-MM-DD (wake date)
  startedAt: string;     // ISO
  endedAt: string;       // ISO
  asleepMin: number;
  disturbances: number;
  /** Per-stage breakdown when the source distinguishes them (Apple Watch ≥ watchOS 9). */
  stages?: SleepStages;
};

export type ParsedRecovery = {
  date: string;
  hrv: number;           // ms
  rhr: number;           // bpm
};

export type ParsedWorkout = {
  date: string;
  sport: Sport;
  startedAt: string;     // ISO
  durationMin: number;
};

/** A single daily vital reading. Daily mean of all samples on that calendar date. */
export type ParsedVital = {
  date: string;          // YYYY-MM-DD
  value: number;
};

export type ParsedVitals = {
  /** Blood oxygen saturation, in % (e.g. 96.5). */
  spo2: ParsedVital[];
  /** Sleeping wrist temp delta from personal baseline, in °C. May be negative. */
  wristTemp: ParsedVital[];
  /** Walking heart rate average, in bpm. */
  walkingHr: ParsedVital[];
  /**
   * Stress score per day (1 = Low, 2 = Moderate, 3 = High) derived from the
   * coefficient of variation of all HR samples recorded that day.
   * Only emitted for days with ≥ 5 HR readings.
   */
  stressScore: ParsedVital[];
};

export type ParseResult = {
  sleep: ParsedSleep[];
  recovery: ParsedRecovery[];
  workouts: ParsedWorkout[];
  vitals: ParsedVitals;
  skipped: {
    sleepSegments: number;
    hrvReadings: number;
    rhrReadings: number;
    workoutRecords: number;
    vitalReadings: number;
  };
};

// ─── Attribute parsing ───────────────────────────────────────────────────

const ATTR = /(\w+)="([^"]*)"/g;

function readAttrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  ATTR.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR.exec(tag))) out[m[1]] = m[2];
  return out;
}

// Apple dates: "2024-01-16 07:30:00 -0500". Convert to ISO.
function toISO(appleDate: string): string | null {
  const m = appleDate.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{4})$/);
  if (!m) return null;
  return `${m[1]}T${m[2]}${m[3].slice(0, 3)}:${m[3].slice(3)}`;
}

function localDate(iso: string): string {
  return iso.slice(0, 10);
}

// ─── Sport mapping ───────────────────────────────────────────────────────

const SPORT_MAP: Record<string, Sport> = {
  Running: "run",
  Walking: "walk",
  Cycling: "ride",
  TraditionalStrengthTraining: "lift",
  FunctionalStrengthTraining: "lift",
  CoreTraining: "lift",
  Swimming: "swim",
  Yoga: "yoga",
  HighIntensityIntervalTraining: "hiit",
  Elliptical: "other",
  Rowing: "other",
};

function mapSport(hkType: string): Sport {
  const key = hkType.replace(/^HKWorkoutActivityType/, "");
  return SPORT_MAP[key] ?? "sport";
}

// ─── Main parse ──────────────────────────────────────────────────────────

type SleepStageKey = "core" | "deep" | "rem" | "unspecified";

const SLEEP_STAGE_MAP: Record<string, SleepStageKey> = {
  HKCategoryValueSleepAnalysisAsleepCore: "core",
  HKCategoryValueSleepAnalysisAsleepDeep: "deep",
  HKCategoryValueSleepAnalysisAsleepREM: "rem",
  HKCategoryValueSleepAnalysisAsleepUnspecified: "unspecified",
  HKCategoryValueSleepAnalysisAsleep: "unspecified", // legacy
};
const SLEEP_AWAKE = "HKCategoryValueSleepAnalysisAwake";

type SleepBucket = {
  startedAt: string;
  endedAt: string;
  asleepMin: number;
  disturbances: number;
  coreMin: number;
  deepMin: number;
  remMin: number;
  awakeMin: number;
  unspecifiedMin: number;
  /** Did we ever see a stage-aware (Core/Deep/REM) segment? */
  hasStages: boolean;
};

/** Running stats for computing stddev without holding all values. */
type HrStats = { count: number; sum: number; sumSq: number };

export function parseAppleHealth(xml: string): ParseResult {
  const sleepByDate = new Map<string, SleepBucket>();
  const hrvByDate = new Map<string, number[]>();
  const rhrByDate = new Map<string, number[]>();
  const spo2ByDate = new Map<string, number[]>();
  const wristTempByDate = new Map<string, number[]>();
  const walkingHrByDate = new Map<string, number[]>();
  /** Intra-day HR samples accumulated as running stats per date. */
  const hrStatsByDate = new Map<string, HrStats>();
  const workouts: ParsedWorkout[] = [];
  const skipped = {
    sleepSegments: 0,
    hrvReadings: 0,
    rhrReadings: 0,
    workoutRecords: 0,
    vitalReadings: 0,
  };

  // <Record .../> (self-closing or with children — we only need the open tag).
  const recordRe = /<Record\b([^>]*?)\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = recordRe.exec(xml))) {
    const attrs = readAttrs(m[1]);
    const type = attrs.type;
    if (!type) continue;
    const startISO = attrs.startDate ? toISO(attrs.startDate) : null;
    const endISO = attrs.endDate ? toISO(attrs.endDate) : null;
    if (!startISO || !endISO) continue;

    if (type === "HKCategoryTypeIdentifierSleepAnalysis") {
      const value = attrs.value ?? "";
      const wakeDate = localDate(endISO);
      const dur = (new Date(endISO).getTime() - new Date(startISO).getTime()) / 60_000;
      if (dur <= 0 || dur > 24 * 60) { skipped.sleepSegments++; continue; }

      const bucket: SleepBucket = sleepByDate.get(wakeDate) ?? {
        startedAt: startISO,
        endedAt: endISO,
        asleepMin: 0,
        disturbances: 0,
        coreMin: 0,
        deepMin: 0,
        remMin: 0,
        awakeMin: 0,
        unspecifiedMin: 0,
        hasStages: false,
      };
      if (startISO < bucket.startedAt) bucket.startedAt = startISO;
      if (endISO > bucket.endedAt) bucket.endedAt = endISO;

      const stage = SLEEP_STAGE_MAP[value];
      if (stage) {
        bucket.asleepMin += dur;
        if (stage === "core") { bucket.coreMin += dur; bucket.hasStages = true; }
        else if (stage === "deep") { bucket.deepMin += dur; bucket.hasStages = true; }
        else if (stage === "rem") { bucket.remMin += dur; bucket.hasStages = true; }
        else { bucket.unspecifiedMin += dur; }
      } else if (value === SLEEP_AWAKE) {
        bucket.disturbances += 1;
        bucket.awakeMin += dur;
      }
      // HKCategoryValueSleepAnalysisInBed → ignored for asleepMin (covers bed bounds).
      sleepByDate.set(wakeDate, bucket);
      continue;
    }

    if (type === "HKQuantityTypeIdentifierHeartRateVariabilitySDNN") {
      const v = Number(attrs.value);
      if (!Number.isFinite(v) || v <= 0) { skipped.hrvReadings++; continue; }
      const d = localDate(startISO);
      const arr = hrvByDate.get(d) ?? [];
      arr.push(v);
      hrvByDate.set(d, arr);
      continue;
    }

    if (type === "HKQuantityTypeIdentifierRestingHeartRate") {
      const v = Number(attrs.value);
      if (!Number.isFinite(v) || v <= 0) { skipped.rhrReadings++; continue; }
      const d = localDate(startISO);
      const arr = rhrByDate.get(d) ?? [];
      arr.push(v);
      rhrByDate.set(d, arr);
      continue;
    }

    if (type === "HKQuantityTypeIdentifierOxygenSaturation") {
      // Apple stores SpO2 as a fraction (0.0–1.0). Some exports store percent
      // (0–100). Detect by magnitude and normalize to percent for display.
      const raw = Number(attrs.value);
      if (!Number.isFinite(raw) || raw <= 0) { skipped.vitalReadings++; continue; }
      const pct = raw <= 1 ? raw * 100 : raw;
      // Plausibility filter — physiological SpO2 sits in 70–100%.
      if (pct < 70 || pct > 100) { skipped.vitalReadings++; continue; }
      const d = localDate(startISO);
      const arr = spo2ByDate.get(d) ?? [];
      arr.push(pct);
      spo2ByDate.set(d, arr);
      continue;
    }

    if (type === "HKQuantityTypeIdentifierAppleSleepingWristTemperature") {
      // This is a *delta* from your personal baseline, in °C. Negative is normal.
      const v = Number(attrs.value);
      if (!Number.isFinite(v) || v < -5 || v > 5) { skipped.vitalReadings++; continue; }
      const d = localDate(startISO);
      const arr = wristTempByDate.get(d) ?? [];
      arr.push(v);
      wristTempByDate.set(d, arr);
      continue;
    }

    if (type === "HKQuantityTypeIdentifierWalkingHeartRateAverage") {
      const v = Number(attrs.value);
      if (!Number.isFinite(v) || v < 40 || v > 220) { skipped.vitalReadings++; continue; }
      const d = localDate(startISO);
      const arr = walkingHrByDate.get(d) ?? [];
      arr.push(v);
      walkingHrByDate.set(d, arr);
      continue;
    }

    // Intra-day HR samples — accumulated as running stats (count/sum/sumSq) to
    // avoid holding thousands of values in memory. Used to derive daily stress score.
    if (type === "HKQuantityTypeIdentifierHeartRate") {
      const v = Number(attrs.value);
      if (!Number.isFinite(v) || v < 30 || v > 250) { skipped.vitalReadings++; continue; }
      const d = localDate(startISO);
      const s = hrStatsByDate.get(d) ?? { count: 0, sum: 0, sumSq: 0 };
      s.count++;
      s.sum += v;
      s.sumSq += v * v;
      hrStatsByDate.set(d, s);
      continue;
    }
  }

  // <Workout .../> — attributes on the open tag only.
  const workoutRe = /<Workout\b([^>]*?)(?:\/?>|>)/g;
  while ((m = workoutRe.exec(xml))) {
    const attrs = readAttrs(m[1]);
    const type = attrs.workoutActivityType;
    const startISO = attrs.startDate ? toISO(attrs.startDate) : null;
    const endISO = attrs.endDate ? toISO(attrs.endDate) : null;
    if (!type || !startISO || !endISO) { skipped.workoutRecords++; continue; }

    const durMin = Number(attrs.duration);
    const unit = attrs.durationUnit ?? "min";
    let durationMin: number;
    if (Number.isFinite(durMin)) {
      durationMin = unit === "s" || unit === "sec" ? durMin / 60 : durMin;
    } else {
      durationMin = (new Date(endISO).getTime() - new Date(startISO).getTime()) / 60_000;
    }
    if (!Number.isFinite(durationMin) || durationMin < 1) { skipped.workoutRecords++; continue; }

    workouts.push({
      date: localDate(startISO),
      sport: mapSport(type),
      startedAt: startISO,
      durationMin: Math.round(durationMin),
    });
  }

  // Assemble buckets.
  const sleep: ParsedSleep[] = [...sleepByDate.entries()]
    .filter(([, b]) => b.asleepMin >= 60) // noise floor: <1h is likely a nap fragment
    .map(([date, b]) => {
      const out: ParsedSleep = {
        date,
        startedAt: b.startedAt,
        endedAt: b.endedAt,
        asleepMin: Math.round(b.asleepMin),
        disturbances: b.disturbances,
      };
      if (b.hasStages) {
        out.stages = {
          coreMin: Math.round(b.coreMin + b.unspecifiedMin), // fold "Asleep" legacy into Core bucket
          deepMin: Math.round(b.deepMin),
          remMin: Math.round(b.remMin),
          awakeMin: Math.round(b.awakeMin),
        };
      }
      return out;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const recovery: ParsedRecovery[] = [];
  for (const [date, hrvs] of hrvByDate) {
    const rhrs = rhrByDate.get(date);
    if (!rhrs || rhrs.length === 0) continue;
    recovery.push({
      date,
      hrv: round(mean(hrvs), 1),
      rhr: Math.round(mean(rhrs)),
    });
  }
  recovery.sort((a, b) => a.date.localeCompare(b.date));

  // Compute daily stress scores from intra-day HR running stats.
  const stressScores: ParsedVital[] = [];
  for (const [date, stats] of hrStatsByDate) {
    const result = computeStressFromStats(stats);
    if (result) stressScores.push({ date, value: result.score });
  }
  stressScores.sort((a, b) => a.date.localeCompare(b.date));

  const vitals: ParsedVitals = {
    spo2: aggregateDailyMean(spo2ByDate, 1),
    wristTemp: aggregateDailyMean(wristTempByDate, 2),
    walkingHr: aggregateDailyMean(walkingHrByDate, 0),
    stressScore: stressScores,
  };

  return { sleep, recovery, workouts, vitals, skipped };
}

function aggregateDailyMean(
  byDate: Map<string, number[]>,
  digits: number,
): ParsedVital[] {
  const out: ParsedVital[] = [];
  for (const [date, values] of byDate) {
    if (values.length === 0) continue;
    out.push({ date, value: round(mean(values), digits) });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
