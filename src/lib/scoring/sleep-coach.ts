/**
 * Sleep Coach — pure bedtime-target calculator.
 *
 * Answers the question Whoop asks: "What time should I go to bed tonight
 * to hit X% sleep performance tomorrow?"
 *
 * All time arithmetic works in minutes-of-day (0..1439) with 24h wrapping,
 * so no Date/TZ surprises in unit tests.
 */

export type BedtimeInput = {
  /** Tonight's computed sleep need in minutes (from computeSleepNeed). */
  sleepNeedMin: number;
  /** Wake time as "HH:MM" (24h, local). Default "07:00". */
  wakeTime?: string;
  /** Typical time-to-fall-asleep in minutes. Default 15. */
  sleepLatencyMin?: number;
  /** Target sleep performance 0–100. Default 90. */
  targetPerformance?: number;
  /**
   * Optional inputs for the human-readable reason breakdown.
   * When absent, only the total need is shown.
   */
  breakdown?: {
    baselineMin: number;          // personal baseline (before bonuses)
    sleepDebtBonus: number;       // extra minutes added for debt
    strainBonus: number;          // extra minutes added for strain
  };
};

export type BedtimeTarget = {
  /** "HH:MM" (24h) — the recommended bedtime for tonight. */
  bedtimeHHMM: string;
  /** Minutes of sleep needed to hit targetPerformance. */
  targetAsleepMin: number;
  /**
   * Array of human-readable reason lines for why the need is what it is.
   * E.g. ["Base 8h 00min", "+22min por strain alto (13.2)", "+18min por deuda de sueño"]
   */
  reasons: string[];
  /** True when the computed bedtime is already past (within the current day). */
  isPast: boolean;
};

const MINUTES_PER_DAY = 24 * 60;

/** Parse "HH:MM" → minutes of day (0..1439). Default 420 (07:00). */
function parseHHMM(hhmm: string | undefined): number {
  if (!hhmm) return 7 * 60;
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 7 * 60;
  return ((h % 24) * 60 + (m % 60) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

/** Format minutes-of-day (0..1439) → "HH:MM". */
export function formatHHMM(minutesOfDay: number): string {
  const m = ((Math.round(minutesOfDay) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Format minutes → "Xh YYmin" (e.g. 510 → "8h 30min"). */
function fmtMin(min: number): string {
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.round(Math.abs(min) % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/**
 * Compute the bedtime target for tonight.
 *
 * The core formula:
 *   targetAsleepMin = sleepNeedMin × (targetPerformance / 100)
 *   bedtimeMinOfDay = wakeTimeMinOfDay − targetAsleepMin − sleepLatencyMin
 */
export function computeBedtimeTarget(input: BedtimeInput): BedtimeTarget {
  const {
    sleepNeedMin,
    wakeTime = "07:00",
    sleepLatencyMin = 15,
    targetPerformance = 90,
    breakdown,
  } = input;

  const targetAsleepMin = sleepNeedMin * (targetPerformance / 100);
  const wakeMinOfDay = parseHHMM(wakeTime);

  const bedtimeRaw = wakeMinOfDay - targetAsleepMin - sleepLatencyMin;
  // Normalise to [0, 1440) — handles "23:45"-style bedtimes that cross midnight
  const bedtimeMinOfDay = ((bedtimeRaw % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;

  const bedtimeHHMM = formatHHMM(bedtimeMinOfDay);

  // Is the bedtime already past? Compare against current time-of-day.
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  // Bedtimes are usually in the evening (18:00–02:00 window).
  // "Past" means: bedtime is before now AND bedtime < wakeTime (i.e. same day, not across midnight).
  const isPast =
    bedtimeMinOfDay < wakeMinOfDay
      ? nowMins > bedtimeMinOfDay // bedtime on same day as wake → straightforward
      : nowMins > bedtimeMinOfDay; // bedtime same day (unusual late waker), same logic

  const reasons: string[] = [];
  if (breakdown) {
    reasons.push(`Base ${fmtMin(breakdown.baselineMin)}`);
    if (breakdown.strainBonus > 0) {
      reasons.push(`+${fmtMin(breakdown.strainBonus)} por strain alto hoy`);
    }
    if (breakdown.sleepDebtBonus > 0) {
      reasons.push(`+${fmtMin(breakdown.sleepDebtBonus)} por deuda de sueño`);
    }
  }

  return {
    bedtimeHHMM,
    targetAsleepMin: Math.round(targetAsleepMin),
    reasons,
    isPast,
  };
}

/**
 * Compute a human-readable countdown from now to a bedtime "HH:MM".
 * Returns null if the bedtime is past (caller should show "you're late" style).
 */
export function bedtimeCountdown(bedtimeHHMM: string): { hours: number; minutes: number } | null {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const bedMins = parseHHMM(bedtimeHHMM);

  // How many minutes until bedtime? Crossing midnight → add 24h.
  let diff = bedMins - nowMins;
  if (diff <= 0) diff += MINUTES_PER_DAY; // wrap to "same time tomorrow"
  // If the wrap would put us >20h away, the bedtime is genuinely past.
  if (diff > 20 * 60) return null;

  return { hours: Math.floor(diff / 60), minutes: diff % 60 };
}
