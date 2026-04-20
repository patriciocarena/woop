"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { suggestStrainTarget } from "@/lib/scoring/strain";
import type { RecoveryEntry } from "@/lib/store/recovery";

export function StrainCoach({
  recovery,
  todayStrain,
}: {
  recovery: RecoveryEntry | undefined;
  todayStrain: number;
}) {
  const target = suggestStrainTarget(recovery?.score, recovery?.zone);
  const onTrack = todayStrain >= target.min && todayStrain <= target.max;
  const overshoot = todayStrain > target.max;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Strain coach</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-fg-muted">
              {target.label}
            </div>
            <div className="font-stat text-2xl mt-1">
              {target.min.toFixed(0)}–{target.max.toFixed(0)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-widest text-fg-muted">Today</div>
            <div className={`font-stat text-2xl mt-1 ${overshoot ? "text-recovery-low" : onTrack ? "text-recovery-high" : "text-fg"}`}>
              {todayStrain.toFixed(1)}
            </div>
          </div>
        </div>
        <p className="text-sm text-fg-muted">{target.rationale}</p>
        {overshoot && (
          <p className="text-xs text-recovery-low">
            You&apos;re over the suggested band. Consider easing tomorrow.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
