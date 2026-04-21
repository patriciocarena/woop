"use client";

import type { SleepStages } from "@/lib/store/sleep";

/**
 * Whoop-style horizontal stacked bar of sleep stages.
 *
 * Rendered when a session has stage info (Apple Watch import or manual entry).
 * Stage colors picked to read on the dark theme without introducing new tokens:
 *   • REM   → sleep accent (purple)        — vivid, high cognition
 *   • Deep  → strain accent (blue)         — restorative, deep blue
 *   • Core  → fg-muted (light grey)        — bulk light sleep
 *   • Awake → recovery-low / red           — disturbances stand out
 */
export function SleepStagesBar({ stages }: { stages: SleepStages }) {
  const total = stages.coreMin + stages.deepMin + stages.remMin + stages.awakeMin;
  if (total <= 0) return null;

  const segs: Array<{ key: keyof SleepStages; label: string; min: number; bg: string }> = [
    { key: "remMin",   label: "REM",   min: stages.remMin,   bg: "bg-sleep" },
    { key: "deepMin",  label: "Deep",  min: stages.deepMin,  bg: "bg-strain" },
    { key: "coreMin",  label: "Light", min: stages.coreMin,  bg: "bg-fg-muted" },
    { key: "awakeMin", label: "Awake", min: stages.awakeMin, bg: "bg-recovery-low" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-3">
        {segs.map((s) => {
          const pct = (s.min / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={s.key}
              className={`${s.bg} h-full transition-[width] duration-700 ease-out`}
              style={{ width: `${pct}%` }}
              title={`${s.label} · ${formatHM(s.min)} (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
        {segs.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${s.bg}`} />
            <span className="text-[11px] uppercase tracking-widest text-fg-muted">
              {s.label}
            </span>
            <span className="ml-auto font-stat text-xs">{formatHM(s.min)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatHM(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}
