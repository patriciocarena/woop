"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ImpactRow } from "@/lib/insights/correlations";
import { BEHAVIORS_BY_ID } from "@/lib/journal/behaviors";
import { cn } from "@/lib/utils";

const CONFIDENCE_LABEL: Record<ImpactRow["confidence"], string> = {
  low: "Low confidence",
  medium: "Medium",
  high: "High",
};

export function BehaviorImpactList({ impacts }: { impacts: ImpactRow[] }) {
  if (impacts.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Behavior impact</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-fg-muted">
            We need at least 3 days with and 3 days without each behavior, plus the
            recovery score from the next morning. Keep logging — the more data,
            the more useful this gets.
          </p>
        </CardContent>
      </Card>
    );
  }

  const topPositive = impacts.filter((r) => r.delta > 0).slice(0, 5);
  const topNegative = impacts.filter((r) => r.delta < 0).slice(0, 5);

  return (
    <Card>
      <CardHeader><CardTitle>Behavior impact on next-day recovery</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <ImpactGroup title="Boosts your recovery" rows={topPositive} positive />
        <ImpactGroup title="Drags your recovery down" rows={topNegative} positive={false} />
        <p className="text-[11px] text-fg-dim">
          These are observational averages, not causation. Confidence improves with
          more samples — Whoop uses 60+ days for stable readings.
        </p>
      </CardContent>
    </Card>
  );
}

function ImpactGroup({
  title,
  rows,
  positive,
}: { title: string; rows: ImpactRow[]; positive: boolean }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] uppercase tracking-[0.18em] text-fg-muted">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-fg-dim">Nothing yet.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => {
            const meta = BEHAVIORS_BY_ID[r.behaviorId];
            const delta = r.delta;
            const sign = delta > 0 ? "+" : "";
            return (
              <li
                key={r.behaviorId}
                className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base leading-none">{meta?.emoji ?? "•"}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{meta?.label ?? r.behaviorId}</div>
                    <div className="text-[10px] text-fg-dim">
                      {r.nWith} with · {r.nWithout} without · {CONFIDENCE_LABEL[r.confidence]}
                    </div>
                  </div>
                </div>
                <div
                  className={cn(
                    "font-stat text-base leading-none",
                    positive ? "text-recovery-high" : "text-recovery-low",
                  )}
                  aria-label={`Delta ${sign}${delta.toFixed(1)} recovery points`}
                >
                  {sign}{delta.toFixed(1)}%
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
