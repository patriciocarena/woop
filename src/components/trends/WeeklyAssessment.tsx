"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeeklyAssessment } from "@/lib/insights/weekly";
import { BEHAVIORS_BY_ID } from "@/lib/journal/behaviors";
import { cn } from "@/lib/utils";

export function WeeklyAssessmentCard({ assessment }: { assessment: WeeklyAssessment }) {
  const range = formatRange(assessment.weekStart, assessment.weekEnd);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly assessment</CardTitle>
        <p className="text-[11px] uppercase tracking-widest text-fg-dim mt-1">{range}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat
            label="Recovery"
            value={assessment.recoveryAvg}
            unit="%"
            delta={assessment.recoveryDelta}
            color="text-recovery-high"
          />
          <Stat
            label="Sleep"
            value={assessment.sleepAvg}
            unit="%"
            delta={assessment.sleepDelta}
            color="text-sleep"
          />
          <Stat
            label="Strain"
            value={assessment.strainAvg}
            unit=""
            delta={assessment.strainDelta}
            color="text-strain"
          />
        </div>

        <ul className="space-y-1.5">
          {assessment.highlights.map((h, i) => (
            <li key={i} className="text-sm text-fg-muted">— {h}</li>
          ))}
        </ul>

        {(assessment.topBehavior || assessment.worstBehavior) && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
            {assessment.topBehavior && (
              <BehaviorCallout label="Top influence" row={assessment.topBehavior} positive />
            )}
            {assessment.worstBehavior && (
              <BehaviorCallout label="Worst influence" row={assessment.worstBehavior} positive={false} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label, value, unit, delta, color,
}: {
  label: string;
  value: number | null;
  unit: string;
  delta: number | null;
  color: string;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-fg-muted">{label}</div>
      <div className={cn("font-stat text-2xl mt-1", color)}>
        {value !== null ? `${value}${unit}` : "—"}
      </div>
      {delta !== null && (
        <div className={cn(
          "text-[11px] uppercase tracking-widest mt-0.5",
          delta > 0 ? "text-recovery-high" : delta < 0 ? "text-recovery-low" : "text-fg-dim",
        )}>
          {delta > 0 ? "+" : ""}{delta}{unit} vs prev
        </div>
      )}
    </div>
  );
}

function BehaviorCallout({
  label, row, positive,
}: {
  label: string;
  row: NonNullable<WeeklyAssessment["topBehavior"]>;
  positive: boolean;
}) {
  const meta = BEHAVIORS_BY_ID[row.behaviorId];
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-fg-muted">{label}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-lg leading-none">{meta?.emoji ?? "•"}</span>
        <span className="text-sm font-medium">{meta?.label ?? row.behaviorId}</span>
      </div>
      <div className={cn(
        "text-[11px] mt-0.5",
        positive ? "text-recovery-high" : "text-recovery-low",
      )}>
        {row.delta > 0 ? "+" : ""}{row.delta.toFixed(1)}% recovery next morning
      </div>
    </div>
  );
}

function formatRange(start: string, end: string): string {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  const sStr = s.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const eStr = e.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${sStr} – ${eStr}`;
}
