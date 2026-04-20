"use client";

import type { RecoveryEntry } from "@/lib/store/recovery";
import { cn } from "@/lib/utils";

const ZONE_BAR: Record<RecoveryEntry["zone"], string> = {
  high: "bg-recovery-high",
  mid: "bg-recovery-mid",
  low: "bg-recovery-low",
  calibrating: "bg-fg-muted",
};

export function RecoveryBreakdown({ entry }: { entry: RecoveryEntry }) {
  const rows = [
    { label: "HRV", value: `${Math.round(entry.hrv)} ms` },
    { label: "Resting HR", value: `${Math.round(entry.rhr)} bpm` },
    ...(entry.respiratoryRate !== undefined
      ? [{ label: "Resp. rate", value: `${entry.respiratoryRate} br/min` }]
      : []),
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-widest text-fg-muted">Score</span>
        <div className="flex-1 mx-3 h-1.5 rounded-full bg-surface-3 overflow-hidden">
          <div
            className={cn("h-full transition-[width] duration-700 ease-out", ZONE_BAR[entry.zone])}
            style={{ width: `${entry.score}%` }}
          />
        </div>
        <span className="text-sm font-stat min-w-[3rem] text-right">{Math.round(entry.score)}%</span>
      </div>
      <dl className="grid grid-cols-3 gap-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-xl bg-surface-2 px-3 py-2">
            <dt className="text-[10px] uppercase tracking-widest text-fg-muted">{r.label}</dt>
            <dd className="font-stat text-xl mt-0.5">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
