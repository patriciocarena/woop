"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVitalsStore } from "@/lib/store/vitals";
import { useJournalStore } from "@/lib/store/journal";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import {
  STRESS_LABELS,
  STRESS_COLORS,
  STRESS_BG_COLORS,
  type StressLevel,
} from "@/lib/scoring/stress";

/** Maps journal mood (1–5) to a stress level (3–1, inverted). */
function moodToStress(mood: 1 | 2 | 3 | 4 | 5): StressLevel {
  if (mood >= 4) return 1; // feeling good → low stress
  if (mood === 3) return 2;
  return 3;                // mood 1–2 → high stress
}

const MOOD_LABELS: Record<number, string> = {
  1: "Terrible",
  2: "Bad",
  3: "Okay",
  4: "Good",
  5: "Great",
};

export function StressCard() {
  const hydrated = useHydrated();
  const stressReadings = useVitalsStore((s) => s.stressScore);
  const journalEntries = useJournalStore((s) => s.entries);

  const today = new Date().toISOString().slice(0, 10);

  // Today's imported HR-derived stress score (if available)
  const importedStress = useMemo(
    () => stressReadings.find((r) => r.date === today),
    [stressReadings, today],
  );

  // Today's journal entry mood (manual fallback)
  const todayMood = useMemo(
    () => journalEntries.find((e) => e.date === today)?.mood,
    [journalEntries, today],
  );

  const setMood = useJournalStore((s) => s.upsertEntry);

  if (!hydrated) return null;

  // Determine displayed stress level
  const stressLevel: StressLevel | null = importedStress
    ? (importedStress.value as StressLevel)
    : todayMood
    ? moodToStress(todayMood)
    : null;

  const source = importedStress
    ? "Apple Health · intra-day HR"
    : todayMood
    ? "Manual · mood log"
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stressLevel !== null ? (
          <>
            {/* Gauge — three segments, active one highlighted */}
            <div className="flex gap-1.5">
              {([1, 2, 3] as StressLevel[]).map((lvl) => (
                <div
                  key={lvl}
                  className={`h-2 flex-1 rounded-full transition-all ${
                    lvl === stressLevel
                      ? lvl === 1
                        ? "bg-recovery-high"
                        : lvl === 2
                        ? "bg-recovery-mid"
                        : "bg-recovery-low"
                      : "bg-surface-3"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className={`font-stat text-3xl ${STRESS_COLORS[stressLevel]}`}>
                {STRESS_LABELS[stressLevel]}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${STRESS_BG_COLORS[stressLevel]}`}
              >
                {stressLevel}/3
              </span>
            </div>

            {source && (
              <p className="text-[11px] uppercase tracking-widest text-fg-dim">{source}</p>
            )}
          </>
        ) : (
          /* No data — manual mood selector */
          <div className="space-y-3">
            <p className="text-sm text-fg-muted">
              ¿Cómo te sentís hoy? Usamos tu estado de ánimo como proxy de stress hasta que
              importes datos de Apple Health.
            </p>
            <div className="flex gap-2">
              {([1, 2, 3, 4, 5] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood({ date: today, mood: m })}
                  className="flex-1 rounded-xl border border-border bg-surface-2 py-2 text-xs text-fg-muted transition-colors hover:border-fg hover:text-fg"
                  title={MOOD_LABELS[m]}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="flex justify-between px-0.5 text-[10px] text-fg-dim">
              <span>Terrible</span>
              <span>Great</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
