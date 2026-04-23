"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSleepStore } from "@/lib/store/sleep";
import { useStrainStore } from "@/lib/store/strain";
import { useProfileStore } from "@/lib/store/profile";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import {
  computeBedtimeTarget,
  bedtimeCountdown,
} from "@/lib/scoring/sleep-coach";
import { computeSleepNeed, computeSleepDebt } from "@/lib/scoring/sleep";
import { dayStrain } from "@/lib/scoring/strain";

const DEFAULT_BASELINE_MIN = 8 * 60; // 480

export function BedtimeRecommendation() {
  const hydrated = useHydrated();
  const sessions = useSleepStore((s) => s.sessions);
  const workouts = useStrainStore((s) => s.workouts);
  const profile = useProfileStore();

  const today = new Date().toISOString().slice(0, 10);

  // Yesterday's strain — needed for sleep need calculation
  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const yesterdayWorkouts = useMemo(
    () => workouts.filter((w) => w.date === yesterday),
    [workouts, yesterday],
  );

  const strainYesterday = useMemo(
    () =>
      dayStrain({
        workouts: yesterdayWorkouts.map((w) => ({
          durationMin: w.durationMin,
          avgHr: w.avgHr,
          maxHr: w.maxHr,
          perceivedRpe: w.perceivedRpe,
        })),
      }),
    [yesterdayWorkouts],
  );

  // Today's strain adds to tonight's need (logged during the day)
  const todayWorkouts = useMemo(
    () => workouts.filter((w) => w.date === today),
    [workouts, today],
  );

  const strainToday = useMemo(
    () =>
      dayStrain({
        workouts: todayWorkouts.map((w) => ({
          durationMin: w.durationMin,
          avgHr: w.avgHr,
          maxHr: w.maxHr,
          perceivedRpe: w.perceivedRpe,
        })),
      }),
    [todayWorkouts],
  );

  // Sleep debt from last 7 nights
  const last7Sessions = useMemo(() => {
    return sessions
      .filter((s) => s.date < today)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);
  }, [sessions, today]);

  const sleepDebtMin = useMemo(
    () =>
      computeSleepDebt(
        last7Sessions.map((s) => ({ needMin: s.needMin, asleepMin: s.asleepMin })),
      ),
    [last7Sessions],
  );

  const baselineMin = profile.sleepNeedMin ?? DEFAULT_BASELINE_MIN;

  // Use the higher of yesterday's + today's strain for tonight's need
  const strainForNeed = Math.max(strainYesterday, strainToday);
  const strainBonus = Math.round(Math.max(0, strainForNeed - 10) * 6);
  const sleepDebtBonus = Math.round(Math.max(0, sleepDebtMin) * 0.5);

  const sleepNeedMin = useMemo(
    () =>
      computeSleepNeed({
        baselineMin,
        sleepDebtMin,
        strainYesterday: strainForNeed,
      }),
    [baselineMin, sleepDebtMin, strainForNeed],
  );

  const target = useMemo(
    () =>
      computeBedtimeTarget({
        sleepNeedMin,
        wakeTime: profile.wakeTime ?? "07:00",
        targetPerformance: 90,
        breakdown: {
          baselineMin,
          strainBonus,
          sleepDebtBonus,
        },
      }),
    [sleepNeedMin, profile.wakeTime, baselineMin, strainBonus, sleepDebtBonus],
  );

  const countdown = useMemo(
    () => bedtimeCountdown(target.bedtimeHHMM),
    [target.bedtimeHHMM],
  );

  if (!hydrated) return null;

  const needHours = Math.floor(target.targetAsleepMin / 60);
  const needMins = target.targetAsleepMin % 60;
  const needLabel = needMins === 0 ? `${needHours}h` : `${needHours}h ${needMins}min`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bedtime tonight</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-3">
          <span className="font-stat text-4xl">{target.bedtimeHHMM}</span>
          {countdown ? (
            <span className="text-sm text-fg-muted">
              en {countdown.hours > 0 ? `${countdown.hours}h ` : ""}
              {countdown.minutes}min
            </span>
          ) : (
            <span className="text-xs text-recovery-mid uppercase tracking-widest">
              ya pasó
            </span>
          )}
        </div>

        <p className="text-xs text-fg-dim">
          Para 90% de performance · wake {profile.wakeTime ?? "07:00"}
        </p>

        <div className="space-y-1 border-t border-border pt-2">
          <p className="text-[11px] uppercase tracking-widest text-fg-dim">
            Sleep need tonight · {needLabel}
          </p>
          {target.reasons.map((r, i) => (
            <p key={i} className="text-xs text-fg-muted">
              {r}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
