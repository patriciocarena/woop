"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useJournalStore, type JournalEntry } from "@/lib/store/journal";
import { BEHAVIORS_BY_ID } from "@/lib/journal/behaviors";

const MOOD_GLYPH: Record<number, string> = {
  1: "🙁", 2: "😐", 3: "🙂", 4: "😄", 5: "🤩",
};

export function JournalHistory() {
  const entries = useJournalStore((s) => s.entries);

  const last7 = useMemo(() => {
    const days: { date: string; entry?: JournalEntry }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().slice(0, 10);
      const entry = entries.find((e) => e.date === date);
      days.push({ date, entry });
    }
    return days;
  }, [entries]);

  return (
    <Card>
      <CardHeader><CardTitle>Last 7 days</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {last7.map(({ date, entry }) => {
          const dayLabel = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          const behaviors = entry?.behaviors ?? [];
          return (
            <div
              key={date}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-widest text-fg-muted">
                    {dayLabel}
                  </span>
                  {entry?.mood && (
                    <span className="text-base leading-none">{MOOD_GLYPH[entry.mood]}</span>
                  )}
                </div>
                {behaviors.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {behaviors.slice(0, 8).map((b) => {
                      const meta = BEHAVIORS_BY_ID[b.behaviorId];
                      if (!meta) return null;
                      return (
                        <span
                          key={b.behaviorId}
                          className="inline-flex items-center gap-1 rounded-full bg-surface-1 border border-border px-2 py-0.5 text-[10px] text-fg-muted"
                          title={meta.label}
                        >
                          <span>{meta.emoji}</span>
                          <span>{meta.label}</span>
                          {b.amount !== undefined && meta.unit && (
                            <span className="text-fg-dim">{b.amount}{meta.unit === "min" ? "m" : ""}</span>
                          )}
                        </span>
                      );
                    })}
                    {behaviors.length > 8 && (
                      <span className="text-[10px] text-fg-dim">+{behaviors.length - 8}</span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-fg-dim mt-1">No entry</p>
                )}
                {entry?.notes && (
                  <p className="mt-1 text-xs text-fg-muted truncate">{entry.notes}</p>
                )}
              </div>
              <div className="text-right">
                <div className="font-stat text-lg leading-none text-fg">
                  {behaviors.length || "—"}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-fg-dim">
                  logged
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
