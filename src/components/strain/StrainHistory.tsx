"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStrainStore } from "@/lib/store/strain";
import { dayStrain, strainBand, MAX_STRAIN } from "@/lib/scoring/strain";

export function StrainHistory() {
  // Subscribe to the raw array; derive the 7-day rollup with useMemo to
  // avoid the React 19 getServerSnapshot loop the deprecated selector
  // would cause (it built a new array on every render).
  const workouts = useStrainStore((s) => s.workouts);
  const days = useMemo(() => {
    const out: { date: string; strain: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().slice(0, 10);
      const dayWorkouts = workouts.filter((w) => w.date === date);
      const strain = dayStrain({
        workouts: dayWorkouts.map((w) => ({
          durationMin: w.durationMin,
          avgHr: w.avgHr,
          maxHr: w.maxHr,
          perceivedRpe: w.perceivedRpe,
        })),
      });
      out.push({ date, strain });
    }
    return out;
  }, [workouts]);
  const max = Math.max(MAX_STRAIN, ...days.map((d) => d.strain));

  return (
    <Card>
      <CardHeader><CardTitle>Last 7 days</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-2 h-32">
          {days.map((d) => {
            const pct = Math.max(4, (d.strain / max) * 100);
            const label = new Date(d.date).toLocaleDateString(undefined, { weekday: "short" });
            return (
              <div key={d.date} className="flex flex-col items-center flex-1">
                <div className="text-[10px] text-fg-dim mb-1">
                  {d.strain > 0 ? d.strain.toFixed(1) : "—"}
                </div>
                <div className="w-full bg-surface-2 rounded-md relative overflow-hidden" style={{ height: "100%" }}>
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-strain rounded-md transition-all"
                    style={{ height: `${pct}%` }}
                    aria-label={`${d.date}: ${d.strain.toFixed(1)} (${strainBand(d.strain)})`}
                  />
                </div>
                <div className="text-[10px] uppercase tracking-widest text-fg-muted mt-2">
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
