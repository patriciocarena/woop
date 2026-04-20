"use client";

import type { RecoveryEntry } from "@/lib/store/recovery";
import { cn } from "@/lib/utils";

const ZONE_COLOR: Record<RecoveryEntry["zone"], string> = {
  high: "text-recovery-high",
  mid: "text-recovery-mid",
  low: "text-recovery-low",
  calibrating: "text-fg-muted",
};

export function RecoveryHistory({ entries }: { entries: RecoveryEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-fg-muted text-center py-6">
        No recovery readings yet — log your first morning to start the baseline.
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {entries
        .slice()
        .reverse()
        .map((e) => (
          <li
            key={e.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2.5"
          >
            <div className="flex flex-col">
              <span className="text-sm font-stat">{formatDate(e.date)}</span>
              <span className="text-[11px] text-fg-dim">
                HRV {Math.round(e.hrv)} · RHR {Math.round(e.rhr)}
                {e.respiratoryRate !== undefined && ` · RR ${e.respiratoryRate}`}
              </span>
            </div>
            <div className={cn("flex items-baseline gap-1", ZONE_COLOR[e.zone])}>
              <span className="font-stat text-2xl">{Math.round(e.score)}</span>
              <span className="text-xs text-fg-dim">%</span>
            </div>
          </li>
        ))}
    </ol>
  );
}

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
