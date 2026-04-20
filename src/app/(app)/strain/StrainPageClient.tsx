"use client";

import { StrainRing } from "@/components/metrics/RecoveryRing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkoutEntryForm } from "@/components/strain/WorkoutEntryForm";
import { WorkoutList } from "@/components/strain/WorkoutList";
import { StrainCoach } from "@/components/strain/StrainCoach";
import { StrainHistory } from "@/components/strain/StrainHistory";
import {
  useStrainStore,
  selectTodayWorkouts,
  selectTodayStrain,
} from "@/lib/store/strain";
import { useRecoveryStore, selectLatestRecovery } from "@/lib/store/recovery";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { strainBand } from "@/lib/scoring/strain";

export function StrainPageClient() {
  const hydrated = useHydrated();
  const todayWorkouts = useStrainStore(selectTodayWorkouts);
  const todayStrain = useStrainStore(selectTodayStrain);
  const recovery = useRecoveryStore(selectLatestRecovery);

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
