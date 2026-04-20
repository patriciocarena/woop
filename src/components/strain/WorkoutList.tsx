"use client";

import { useStrainStore, type Workout } from "@/lib/store/strain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { strainBand } from "@/lib/scoring/strain";

const SPORT_LABEL: Record<Workout["sport"], string> = {
  run: "Run",
  walk: "Walk",
  ride: "Ride",
  lift: "Lift",
  swim: "Swim",
  yoga: "Yoga",
  hiit: "HIIT",
  sport: "Sport",
  other: "Other",
};

export function WorkoutList({ workouts }: { workouts: Workout[] }) {
  const removeWorkout = useStrainStore((s) => s.removeWorkout);

  if (workouts.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Today&apos;s workouts</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-fg-muted">
            No workouts logged. Even a 30-min walk counts — every minute adds to your day strain.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>Today&apos;s workouts</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {workouts.map((w) => (
          <div
            key={w.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{SPORT_LABEL[w.sport]}</span>
                <span className="text-[11px] uppercase tracking-widest text-fg-dim">
                  {w.durationMin} min
                </span>
                {w.avgHr && (
                  <span className="text-[11px] uppercase tracking-widest text-fg-dim">
                    {w.avgHr} bpm
                  </span>
                )}
                {!w.avgHr && w.perceivedRpe && (
                  <span className="text-[11px] uppercase tracking-widest text-fg-dim">
                    RPE {w.perceivedRpe}
                  </span>
                )}
              </div>
              {w.notes && <p className="mt-1 text-xs text-fg-muted truncate">{w.notes}</p>}
            </div>
            <div className="text-right">
              <div className="font-stat text-lg leading-none text-strain">
                {w.strain.toFixed(1)}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-fg-dim">
                {strainBand(w.strain)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeWorkout(w.id)}
              className="text-fg-dim hover:text-recovery-low text-xs"
              aria-label="Delete workout"
            >
              ×
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
