"use client";

import type { SleepSession } from "@/lib/store/sleep";

export function SleepHistory({ sessions }: { sessions: SleepSession[] }) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-fg-muted text-center py-6">
        No history yet. Log your first night to start a streak.
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {sessions
        .slice()
        .reverse()
        .map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2.5"
          >
            <div className="flex flex-col">
              <span className="text-sm font-stat">{formatDate(s.date)}</span>
              <span className="text-[11px] text-fg-dim">
                {formatHours(s.asleepMin)} asleep · need {formatHours(s.needMin)}
              </span>
            </div>
            <ScoreBadge value={s.performance} />
          </li>
        ))}
    </ol>
  );
}

function ScoreBadge({ value }: { value: number }) {
  return (
    <div className="flex items-baseline gap-1 text-sleep">
      <span className="font-stat text-2xl">{Math.round(value)}</span>
      <span className="text-xs text-fg-dim">%</span>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatHours(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}
