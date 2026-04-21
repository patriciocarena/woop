"use client";

import type { ParseResult } from "./apple-health";
import { useSleepStore } from "@/lib/store/sleep";
import { useRecoveryStore } from "@/lib/store/recovery";
import { useStrainStore } from "@/lib/store/strain";

export type ApplySummary = {
  sleepAdded: number;
  sleepSkipped: number;
  recoveryAdded: number;
  recoverySkipped: number;
  workoutsAdded: number;
  workoutsSkipped: number;
};

/** Applies a parsed Apple Health export to the local-first stores.
 *  Duplicates (same date for sleep/recovery, same startedAt for workouts) are skipped. */
export function applyAppleHealthImport(result: ParseResult): ApplySummary {
  const summary: ApplySummary = {
    sleepAdded: 0, sleepSkipped: 0,
    recoveryAdded: 0, recoverySkipped: 0,
    workoutsAdded: 0, workoutsSkipped: 0,
  };

  const sleepStore = useSleepStore.getState();
  const existingSleepDates = new Set(sleepStore.sessions.map((s) => s.date));
  for (const s of result.sleep) {
    if (existingSleepDates.has(s.date)) { summary.sleepSkipped++; continue; }
    sleepStore.addSession({
      date: s.date,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      asleepMin: s.asleepMin,
      disturbances: s.disturbances,
      stages: s.stages,
    });
    summary.sleepAdded++;
  }

  const recoveryStore = useRecoveryStore.getState();
  const existingRecoveryDates = new Set(recoveryStore.entries.map((e) => e.date));
  for (const r of result.recovery) {
    if (existingRecoveryDates.has(r.date)) { summary.recoverySkipped++; continue; }
    recoveryStore.addEntry({
      date: r.date,
      hrv: r.hrv,
      rhr: r.rhr,
    });
    summary.recoveryAdded++;
  }

  const strainStore = useStrainStore.getState();
  const existingWorkoutKeys = new Set(strainStore.workouts.map((w) => `${w.date}:${w.startedAt}`));
  for (const w of result.workouts) {
    const key = `${w.date}:${w.startedAt}`;
    if (existingWorkoutKeys.has(key)) { summary.workoutsSkipped++; continue; }
    strainStore.addWorkout({
      date: w.date,
      sport: w.sport,
      startedAt: w.startedAt,
      durationMin: w.durationMin,
    });
    summary.workoutsAdded++;
  }

  return summary;
}
