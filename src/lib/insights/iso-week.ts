/**
 * ISO week utilities.
 *
 * ISO 8601: week 1 is the week containing the first Thursday of the year.
 * Weeks run Monday → Sunday.
 */

/** Returns "YYYY-Www" for the week containing the given date. */
export function isoWeekOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  // Move to Thursday of the same ISO week (ISO week boundary rule)
  const dayOfWeek = d.getDay() || 7; // Sun=0 → 7, Mon=1
  const thursday = new Date(d);
  thursday.setDate(d.getDate() + (4 - dayOfWeek));
  // Jan 1 of the year that owns this Thursday
  const yearStart = new Date(thursday.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((thursday.getTime() - yearStart.getTime()) / 86_400_000 + yearStart.getDay() + 1) / 7,
  );
  return `${thursday.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/** Returns today's ISO week key, e.g. "2026-W17". */
export function currentIsoWeek(): string {
  return isoWeekOf(new Date().toISOString().slice(0, 10));
}

/**
 * Returns the Monday (YYYY-MM-DD) of the given ISO week string.
 * Returns null if the string is not a valid "YYYY-Www" key.
 */
export function mondayOfIsoWeek(isoWeek: string): string | null {
  const m = isoWeek.match(/^(\d{4})-W(\d{1,2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  if (week < 1 || week > 53) return null;

  // Jan 4 is always in week 1 (ISO rule: week 1 contains the year's first Thursday)
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // Mon=1 … Sun=7
  // Monday of week 1
  const monday1 = new Date(jan4);
  monday1.setDate(jan4.getDate() - (dayOfWeek - 1));
  // Monday of requested week
  const target = new Date(monday1);
  target.setDate(monday1.getDate() + (week - 1) * 7);
  return target.toISOString().slice(0, 10);
}

/** Human-readable label for a period, e.g. "Apr 20 – Apr 26, 2026". */
export function periodLabel(isoWeek: string): string {
  const monday = mondayOfIsoWeek(isoWeek);
  if (!monday) return isoWeek;
  const start = new Date(`${monday}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
}
