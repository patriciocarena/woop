"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStrainStore, selectLast7DaysStrain } from "@/lib/store/strain";
import { strainBand, MAX_STRAIN } from "@/lib/scoring/strain";

export function StrainHistory() {
  const days = useStrainStore(selectLast7DaysStrain);
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
