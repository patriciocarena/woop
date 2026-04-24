"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart } from "@/components/trends/TrendChart";
import { BehaviorImpactList } from "@/components/trends/BehaviorImpactList";
import { WeeklyAssessmentCard } from "@/components/trends/WeeklyAssessment";
import { CalendarHeatmap } from "@/components/trends/CalendarHeatmap";
import { useRecoveryStore } from "@/lib/store/recovery";
import { useSleepStore } from "@/lib/store/sleep";
import { useStrainStore } from "@/lib/store/strain";
import { useJournalStore } from "@/lib/store/journal";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import {
  buildDailySeries,
  addRollingMean,
  type DailyPoint,
} from "@/lib/insights/trends";
import { behaviorImpacts } from "@/lib/insights/correlations";
import { buildWeeklyAssessment } from "@/lib/insights/weekly";
import { currentIsoWeek } from "@/lib/insights/iso-week";
import { dayStrain } from "@/lib/scoring/strain";
import { cn } from "@/lib/utils";

const RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
  { label: "90d", days: 90 },
] as const;

export function TrendsPageClient() {
  const hydrated = useHydrated();
  const recoveryEntries = useRecoveryStore((s) => s.entries);
  const sleepSessions = useSleepStore((s) => s.sessions);
  const workouts = useStrainStore((s) => s.workouts);
  const journalEntries = useJournalStore((s) => s.entries);

  const [days, setDays] = useState<number>(7);

  const recoveryByDate = useMemo(
    () => new Map(recoveryEntries.map((e) => [e.date, e.score])),
    [recoveryEntries],
  );

  const recoverySeries = useMemo<DailyPoint[]>(() => {
    return addRollingMean(buildDailySeries({ days, byDate: recoveryByDate }), 7);
  }, [recoveryByDate, days]);

  const sleepSeries = useMemo<DailyPoint[]>(() => {
    const map = new Map(sleepSessions.map((s) => [s.date, s.performance]));
    return addRollingMean(buildDailySeries({ days, byDate: map }), 7);
  }, [sleepSessions, days]);

  const strainSeries = useMemo<DailyPoint[]>(() => {
    // Strain is computed per day from raw workouts.
    const byDate = new Map<string, number>();
    const grouped = new Map<string, typeof workouts>();
    for (const w of workouts) {
      const arr = grouped.get(w.date) ?? [];
      arr.push(w);
      grouped.set(w.date, arr);
    }
    for (const [date, ws] of grouped) {
      byDate.set(date, dayStrain({
        workouts: ws.map((w) => ({
          durationMin: w.durationMin,
          avgHr: w.avgHr,
          maxHr: w.maxHr,
          perceivedRpe: w.perceivedRpe,
        })),
        ambientTrimp: 0,
      }));
    }
    return addRollingMean(buildDailySeries({ days, byDate }), 7);
  }, [workouts, days]);

  const impacts = useMemo(() => {
    return behaviorImpacts({
      recovery: recoveryEntries.map((e) => ({ date: e.date, score: e.score })),
      journal: journalEntries.map((j) => ({
        date: j.date,
        behaviors: j.behaviors.map((b) => b.behaviorId),
      })),
    });
  }, [recoveryEntries, journalEntries]);

  const assessment = useMemo(() => {
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
    });
  }, [recoveryEntries, sleepSessions, workouts, journalEntries]);

  if (!hydrated) {
    return (
      <Card>
        <CardHeader><CardTitle>Trends</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-fg-muted text-center py-6">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <WeeklyAssessmentCard assessment={assessment} />

      <div className="flex justify-end">
        <a
          href={`/assessment/${currentIsoWeek()}`}
          className="text-xs uppercase tracking-widest text-fg-muted hover:text-fg transition-colors"
        >
          Ver assessment completo →
        </a>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.18em] text-fg-muted">Last {days} days</h2>
        <div className="flex gap-1 rounded-full bg-surface-2 p-1">
          {RANGES.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => setDays(r.days)}
              className={cn(
                "rounded-full px-3 py-1 text-xs transition-colors",
                days === r.days
                  ? "bg-fg text-bg"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <TrendChart
        title="Recovery"
        data={recoverySeries}
        color="var(--color-recovery-high)"
        unit="%"
        referenceLines={[
          { y: 67, color: "var(--color-recovery-high)" },
          { y: 34, color: "var(--color-recovery-low)" },
        ]}
      />

      <TrendChart
        title="Sleep performance"
        data={sleepSeries}
        color="var(--color-sleep)"
        unit="%"
      />

      <TrendChart
        title="Day strain"
        data={strainSeries}
        color="var(--color-strain)"
        unit=""
        yMax={21}
      />

      <CalendarHeatmap byDate={recoveryByDate} days={91} title="Recovery · last 13 weeks" />

      <BehaviorImpactList impacts={impacts} />
    </div>
  );
}
