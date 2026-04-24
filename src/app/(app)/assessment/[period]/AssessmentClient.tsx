"use client";

import { useMemo } from "react";
import { useRecoveryStore } from "@/lib/store/recovery";
import { useSleepStore } from "@/lib/store/sleep";
import { useStrainStore } from "@/lib/store/strain";
import { useJournalStore } from "@/lib/store/journal";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { buildWeeklyAssessment } from "@/lib/insights/weekly";
import { mondayOfIsoWeek } from "@/lib/insights/iso-week";
import { dayStrain } from "@/lib/scoring/strain";
import { AssessmentReport } from "@/components/assessment/AssessmentReport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { period: string; label: string };

export function AssessmentClient({ period, label }: Props) {
  const hydrated = useHydrated();
  const recoveryEntries = useRecoveryStore((s) => s.entries);
  const sleepSessions = useSleepStore((s) => s.sessions);
  const workouts = useStrainStore((s) => s.workouts);
  const journalEntries = useJournalStore((s) => s.entries);

  // Resolve period → Monday date so buildWeeklyAssessment picks the right week
  const monday = mondayOfIsoWeek(period);

  const assessment = useMemo(() => {
    if (!monday) return null;
    const strainPoints: { date: string; strain: number }[] = [];
    const grouped = new Map<string, typeof workouts>();
    for (const w of workouts) {
      const arr = grouped.get(w.date) ?? [];
      arr.push(w);
      grouped.set(w.date, arr);
    }
    for (const [date, ws] of grouped) {
      strainPoints.push({
        date,
        strain: dayStrain({
          workouts: ws.map((w) => ({
            durationMin: w.durationMin,
            avgHr: w.avgHr,
            maxHr: w.maxHr,
            perceivedRpe: w.perceivedRpe,
          })),
          ambientTrimp: 0,
        }),
      });
    }
    return buildWeeklyAssessment({
      recovery: recoveryEntries.map((e) => ({ date: e.date, score: e.score })),
      sleep: sleepSessions.map((s) => ({ date: s.date, performance: s.performance })),
      strain: strainPoints,
      journal: journalEntries.map((j) => ({
        date: j.date,
        behaviors: j.behaviors.map((b) => b.behaviorId),
      })),
      asOf: monday,
    });
  }, [monday, recoveryEntries, sleepSessions, workouts, journalEntries]);

  if (!monday) {
    return (
      <Card>
        <CardHeader><CardTitle>Invalid period</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-fg-muted">
            Use the format <code className="font-mono text-fg">2026-W17</code> in the URL.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!hydrated || !assessment) {
    return (
      <Card>
        <CardHeader><CardTitle>Assessment</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-fg-muted text-center py-6">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Print button — hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-fg-muted">Performance Assessment</p>
          <h1 className="font-stat text-3xl mt-1">{label}</h1>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full border border-border px-4 py-2 text-sm text-fg-muted hover:text-fg transition-colors"
        >
          Print / Save PDF
        </button>
      </div>

      <AssessmentReport assessment={assessment} period={period} label={label} />
    </div>
  );
}
