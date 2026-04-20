/**
 * Builds the *volatile* context block sent to the coach route. Everything here
 * changes day-to-day, so it belongs in the user message — never the cached
 * system prompt.
 *
 * Deterministic serialization: fields appear in a fixed order, numbers are
 * rounded, so two equal states produce byte-identical JSON.
 */

import type { RecoveryEntry } from "@/lib/store/recovery";
import type { SleepSession } from "@/lib/store/sleep";
import type { Workout } from "@/lib/store/strain";
import type { JournalEntry } from "@/lib/store/journal";
import { dayStrain } from "@/lib/scoring/strain";
import { behaviorImpacts } from "@/lib/insights/correlations";
import { BEHAVIORS_BY_ID } from "@/lib/journal/behaviors";

export type CoachContext = {
  today: string;
  recovery: {
    todayScore: number | null;
    todayZone: string | null;
    last7Avg: number | null;
    last30Avg: number | null;
  };
  sleep: {
    lastPerformance: number | null;
    last7AvgPerformance: number | null;
    last7AvgHours: number | null;
  };
  strain: {
    todayStrain: number;
    todayWorkouts: number;
    last7AvgStrain: number | null;
  };
  behaviors: {
    loggedToday: string[];
    topNegative: { label: string; delta: number }[];
    topPositive: { label: string; delta: number }[];
  };
};

function round(n: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function avgOrNull(values: number[]): number | null {
  if (values.length === 0) return null;
  return round(values.reduce((a, b) => a + b, 0) / values.length);
}

function lastNDates(today: string, n: number): string[] {
  const out: string[] = [];
  const base = new Date(`${today}T00:00:00`);
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function buildCoachContext({
  today,
  recovery,
  sleep,
  workouts,
  journal,
}: {
  today: string;
  recovery: RecoveryEntry[];
  sleep: SleepSession[];
  workouts: Workout[];
  journal: JournalEntry[];
}): CoachContext {
  const last7 = new Set(lastNDates(today, 7));
  const last30 = new Set(lastNDates(today, 30));

  const todayRecovery = recovery.find((r) => r.date === today) ?? null;
  const rec7 = recovery.filter((r) => last7.has(r.date)).map((r) => r.score);
  const rec30 = recovery.filter((r) => last30.has(r.date)).map((r) => r.score);

  const todaySleep = sleep.find((s) => s.date === today) ?? null;
  const lastSleep = todaySleep ?? [...sleep].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  const sleep7 = sleep.filter((s) => last7.has(s.date));

  // Strain per day from workouts.
  const strainByDate = new Map<string, number>();
  const wGrouped = new Map<string, Workout[]>();
  for (const w of workouts) {
    const arr = wGrouped.get(w.date) ?? [];
    arr.push(w);
    wGrouped.set(w.date, arr);
  }
  for (const [date, ws] of wGrouped) {
    strainByDate.set(
      date,
      dayStrain({
        workouts: ws.map((w) => ({
          durationMin: w.durationMin,
          avgHr: w.avgHr,
          maxHr: w.maxHr,
          perceivedRpe: w.perceivedRpe,
        })),
        ambientTrimp: 0,
      }),
    );
  }
  const todayStrain = strainByDate.get(today) ?? 0;
  const strain7 = [...strainByDate.entries()]
    .filter(([d]) => last7.has(d))
    .map(([, v]) => v);

  const todayJournal = journal.find((j) => j.date === today);
  const loggedToday = (todayJournal?.behaviors ?? [])
    .map((b) => BEHAVIORS_BY_ID[b.behaviorId]?.label ?? b.behaviorId)
    .sort();

  const impacts = behaviorImpacts({
    recovery: recovery.map((r) => ({ date: r.date, score: r.score })),
    journal: journal.map((j) => ({
      date: j.date,
      behaviors: j.behaviors.map((b) => b.behaviorId),
    })),
  });
  const topNegative = impacts
    .filter((r) => r.delta < 0 && r.confidence !== "low")
    .slice(0, 3)
    .map((r) => ({
      label: BEHAVIORS_BY_ID[r.behaviorId]?.label ?? r.behaviorId,
      delta: round(r.delta),
    }));
  const topPositive = impacts
    .filter((r) => r.delta > 0 && r.confidence !== "low")
    .slice(0, 3)
    .map((r) => ({
      label: BEHAVIORS_BY_ID[r.behaviorId]?.label ?? r.behaviorId,
      delta: round(r.delta),
    }));

  return {
    today,
    recovery: {
      todayScore: todayRecovery ? round(todayRecovery.score) : null,
      todayZone: todayRecovery?.zone ?? null,
      last7Avg: avgOrNull(rec7),
      last30Avg: avgOrNull(rec30),
    },
    sleep: {
      lastPerformance: lastSleep ? round(lastSleep.performance) : null,
      last7AvgPerformance: avgOrNull(sleep7.map((s) => s.performance)),
      last7AvgHours: avgOrNull(sleep7.map((s) => s.asleepMin / 60)),
    },
    strain: {
      todayStrain: round(todayStrain),
      todayWorkouts: wGrouped.get(today)?.length ?? 0,
      last7AvgStrain: avgOrNull(strain7),
    },
    behaviors: {
      loggedToday,
      topNegative,
      topPositive,
    },
  };
}
