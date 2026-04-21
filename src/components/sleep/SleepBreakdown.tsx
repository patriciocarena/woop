"use client";

import { computeSleepPerformance } from "@/lib/scoring/sleep";
import type { SleepSession } from "@/lib/store/sleep";

export function SleepBreakdown({ session }: { session: SleepSession }) {
  const { parts } = computeSleepPerformance({
    asleepMin: session.asleepMin,
    needMin: session.needMin,
    timeInBedMin: session.timeInBedMin,
    stages: session.stages,
  });

  const rows: Array<{ label: string; value: string; bar?: number }> = [
    { label: "Asleep", value: formatHours(session.asleepMin), bar: parts.duration },
    { label: "Need", value: formatHours(session.needMin), bar: 100 },
    { label: "Efficiency", value: `${Math.round(parts.efficiency)}%`, bar: parts.efficiency },
  ];
  if (session.stages) {
    rows.push({ label: "Quality (REM+Deep)", value: `${Math.round(parts.quality)}%`, bar: parts.quality });
  }
  rows.push({ label: "Disturbances", value: String(session.disturbances) });

  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3">
          <span className="text-[11px] uppercase tracking-widest text-fg-muted w-28">{row.label}</span>
          {row.bar !== undefined && (
            <div className="flex-1 h-1.5 rounded-full bg-surface-3 overflow-hidden">
              <div
                className="h-full bg-sleep transition-[width] duration-700 ease-out"
                style={{ width: `${Math.min(100, row.bar)}%` }}
              />
            </div>
          )}
          <span className="text-sm font-stat min-w-[3rem] text-right">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function formatHours(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}
