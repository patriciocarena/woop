/**
 * Weekly Performance Assessment.
 *
 * Whoop ships these every Monday. We compute the same shape on demand from
 * local data — when the backend lands, a Supabase edge function on a cron
 * can write the result to a `weekly_assessments` table and email it.
 */

import { mean } from "./stats";
import { mondayOf, todayStr } from "./trends";
import { behaviorImpacts, type ImpactRow } from "./correlations";

export type WeeklyAssessment = {
  weekStart: string;        // Monday YYYY-MM-DD
  weekEnd: string;          // Sunday YYYY-MM-DD
  recoveryAvg: number | null;
  recoveryDelta: number | null;   // vs previous week (null if no prior data)
  sleepAvg: number | null;
  sleepDelta: number | null;
  strainAvg: number | null;
  strainDelta: number | null;
  daysLogged: number;
  topBehavior: ImpactRow | null;        // most positive influence
  worstBehavior: ImpactRow | null;      // most negative influence
  highlights: string[];                 // human-readable bullet points
};

export type AssessmentInputs = {
  recovery: { date: string; score: number }[];
  sleep: { date: string; performance: number }[];
  strain: { date: string; strain: number }[];
  journal: { date: string; behaviors: string[] }[];
  /** Override "today" for tests. */
  asOf?: string;
};

export function buildWeeklyAssessment(inputs: AssessmentInputs): WeeklyAssessment {
  const asOf = inputs.asOf ?? todayStr();
  const weekStart = mondayOf(asOf);
  const weekEnd = addDays(weekStart, 6);
  const prevWeekStart = addDays(weekStart, -7);
  const prevWeekEnd = addDays(weekStart, -1);

  const recoveryThis = filterRange(inputs.recovery, weekStart, weekEnd).map((r) => r.score);
  const recoveryPrev = filterRange(inputs.recovery, prevWeekStart, prevWeekEnd).map((r) => r.score);
  const sleepThis = filterRange(inputs.sleep, weekStart, weekEnd).map((s) => s.performance);
  const sleepPrev = filterRange(inputs.sleep, prevWeekStart, prevWeekEnd).map((s) => s.performance);
  const strainThis = filterRange(inputs.strain, weekStart, weekEnd).filter((s) => s.strain > 0).map((s) => s.strain);
  const strainPrev = filterRange(inputs.strain, prevWeekStart, prevWeekEnd).filter((s) => s.strain > 0).map((s) => s.strain);

  const recoveryAvg = recoveryThis.length ? round1(mean(recoveryThis)) : null;
  const sleepAvg = sleepThis.length ? round1(mean(sleepThis)) : null;
  const strainAvg = strainThis.length ? round1(mean(strainThis)) : null;

  const recoveryDelta =
    recoveryAvg !== null && recoveryPrev.length ? round1(recoveryAvg - mean(recoveryPrev)) : null;
  const sleepDelta =
    sleepAvg !== null && sleepPrev.length ? round1(sleepAvg - mean(sleepPrev)) : null;
  const strainDelta =
    strainAvg !== null && strainPrev.length ? round1(strainAvg - mean(strainPrev)) : null;

  // Behavior impacts use the *full* journal+recovery history — a week of
  // data is far too little to find meaningful effects.
  const impacts = behaviorImpacts({ recovery: inputs.recovery, journal: inputs.journal });
  const topBehavior = impacts.find((r) => r.delta > 0) ?? null;
  const worstBehavior = impacts.find((r) => r.delta < 0) ?? null;

  const highlights = buildHighlights({
    recoveryAvg, recoveryDelta, sleepAvg, sleepDelta, strainAvg, strainDelta,
  });

  const daysLogged = filterRange(inputs.recovery, weekStart, weekEnd).length;

  return {
    weekStart, weekEnd,
    recoveryAvg, recoveryDelta,
    sleepAvg, sleepDelta,
    strainAvg, strainDelta,
    daysLogged,
    topBehavior, worstBehavior,
    highlights,
  };
}

function buildHighlights(p: {
  recoveryAvg: number | null; recoveryDelta: number | null;
  sleepAvg: number | null;    sleepDelta: number | null;
  strainAvg: number | null;   strainDelta: number | null;
}): string[] {
  const out: string[] = [];
  if (p.recoveryAvg !== null) {
    const trend = p.recoveryDelta === null
      ? ""
      : p.recoveryDelta >= 1 ? ` (+${p.recoveryDelta} vs last week)`
      : p.recoveryDelta <= -1 ? ` (${p.recoveryDelta} vs last week)`
      : " (steady vs last week)";
    out.push(`Recovery averaged ${p.recoveryAvg}%${trend}.`);
  }
  if (p.sleepAvg !== null) {
    const trend = p.sleepDelta === null
      ? ""
      : p.sleepDelta >= 2 ? ` — up ${p.sleepDelta}% from last week`
      : p.sleepDelta <= -2 ? ` — down ${Math.abs(p.sleepDelta)}% from last week`
      : "";
    out.push(`Sleep performance averaged ${p.sleepAvg}%${trend}.`);
  }
  if (p.strainAvg !== null) {
    out.push(`Average daily strain on training days was ${p.strainAvg}/21.`);
  }
  if (out.length === 0) {
    out.push("Not enough data this week — log a few mornings and we'll have something to say.");
  }
  return out;
}

function filterRange<T extends { date: string }>(items: T[], start: string, end: string): T[] {
  return items.filter((i) => i.date >= start && i.date <= end);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
