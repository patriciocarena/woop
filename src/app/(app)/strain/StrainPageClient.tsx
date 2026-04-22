"use client";

import { useMemo } from "react";
import { StrainRing } from "@/components/metrics/RecoveryRing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkoutEntryForm } from "@/components/strain/WorkoutEntryForm";
import { WorkoutList } from "@/components/strain/WorkoutList";
import { StrainCoach } from "@/components/strain/StrainCoach";
import { StrainHistory } from "@/components/strain/StrainHistory";
import { useStrainStore } from "@/lib/store/strain";
import { useRecoveryStore, selectLatestRecovery } from "@/lib/store/recovery";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { dayStrain, strainBand } from "@/lib/scoring/strain";

export function StrainPageClient() {
  const hydrated = useHydrated();
  // Subscribe to the raw array (stable reference) and derive today's slices
  // with useMemo to avoid the React 19 getServerSnapshot infinite loop.
  const workouts = useStrainStore((s) => s.workouts);
  const recovery = useRecoveryStore(selectLatestRecovery);

  const today = new Date().toISOString().slice(0, 10);
  const todayWorkouts = useMemo(
    () => workouts.filter((w) => w.date === today),
    [workouts, today],
  );
  const todayStrain = useMemo(
    () =>
      dayStrain({
        workouts: todayWorkouts.map((w) => ({
          durationMin: w.durationMin,
          avgHr: w.avgHr,
          maxHr: w.maxHr,
          perceivedRpe: w.perceivedRpe,
        })),
      }),
    [todayWorkouts],
  );

  const ringValue = hydrated ? todayStrain : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-2">
        <StrainRing value={ringValue} size={220} />
        {hydrated && (
          <p className="text-[11px] uppercase tracking-widest text-fg-muted">
            {strainBand(todayStrain)}
          </p>
        )}
      </div>

      <StrainCoach recovery={hydrated ? recovery : undefined} todayStrain={ringValue} />

      <Card>
        <CardHeader><CardTitle>Log a workout</CardTitle></CardHeader>
        <CardContent>
          <WorkoutEntryForm />
        </CardContent>
      </Card>

      {hydrated ? (
        <WorkoutList workouts={todayWorkouts} />
      ) : (
        <Card>
          <CardHeader><CardTitle>Today&apos;s workouts</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-fg-muted text-center py-6">Loading…</p>
          </CardContent>
        </Card>
      )}

      {hydrated && <StrainHistory />}
    </div>
  );
}
