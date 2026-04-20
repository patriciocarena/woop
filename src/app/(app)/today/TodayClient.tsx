"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecoveryRing, StrainRing, SleepRing } from "@/components/metrics/RecoveryRing";
import { useSleepStore, selectLatestSleep } from "@/lib/store/sleep";
import {
  useRecoveryStore,
  selectLatestRecovery,
  selectIsCalibrating,
} from "@/lib/store/recovery";
import { useStrainStore } from "@/lib/store/strain";
import { dayStrain } from "@/lib/scoring/strain";
import { useJournalStore } from "@/lib/store/journal";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { DailyCoach } from "@/components/today/DailyCoach";
import { InstallPromptCard } from "@/components/pwa/InstallPromptCard";

export function TodayClient() {
  const hydrated = useHydrated();
  const latestSleep = useSleepStore(selectLatestSleep);
  const latestRecovery = useRecoveryStore(selectLatestRecovery);
  const calibrating = useRecoveryStore(selectIsCalibrating);

  // Raw array selectors return stable references; derive "today" slices via
  // useMemo to avoid the getServerSnapshot infinite-loop warning that fires
  // when a selector returns a new array on every call.
  const workouts = useStrainStore((s) => s.workouts);
  const journalEntries = useJournalStore((s) => s.entries);

  const today = new Date().toISOString().slice(0, 10);

  const todayWorkouts = useMemo(
    () => workouts.filter((w) => w.date === today),
    [workouts, today],
  );
  const todayStrain = useMemo(
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
  const todayJournal = useMemo(
    () => journalEntries.find((e) => e.date === today),
    [journalEntries, today],
  );

  const strain = hydrated ? todayStrain : 0;
  const recovery = hydrated && latestRecovery ? latestRecovery.score : 0;
  const sleep = hydrated && latestSleep ? latestSleep.performance : 0;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-fg-muted">Today</p>
        <h1 className="font-stat text-4xl mt-1">{greeting()}</h1>
      </header>

      <Link href="/recovery" className="flex flex-col items-center gap-2">
        <RecoveryRing value={recovery} size={260} />
        {hydrated && !latestRecovery && (
          <p className="text-[11px] uppercase tracking-widest text-fg-dim">Tap to log HRV / RHR</p>
        )}
        {hydrated && calibrating && latestRecovery && (
          <p className="text-[11px] uppercase tracking-widest text-fg-muted">Calibrating</p>
        )}
      </Link>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/strain">
          <Card className="flex flex-col items-center transition-colors hover:bg-surface-2">
            <CardHeader className="w-full"><CardTitle>Strain</CardTitle></CardHeader>
            <StrainRing value={strain} size={140} />
            {hydrated && todayWorkouts.length === 0 && (
              <p className="text-[11px] uppercase tracking-widest text-fg-dim mt-2">Tap to log</p>
            )}
          </Card>
        </Link>
        <Link href="/sleep">
          <Card className="flex flex-col items-center transition-colors hover:bg-surface-2">
            <CardHeader className="w-full"><CardTitle>Sleep</CardTitle></CardHeader>
            <SleepRing value={sleep} size={140} />
            {hydrated && !latestSleep && (
              <p className="text-[11px] uppercase tracking-widest text-fg-dim mt-2">Tap to log</p>
            )}
          </Card>
        </Link>
      </div>

      <InstallPromptCard />

      <DailyCoach />

      <Card>
        <CardHeader><CardTitle>Quick read</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-fg-muted">{insightFor({ hydrated, recovery: latestRecovery, sleep: latestSleep, strain, workouts: todayWorkouts.length })}</p>
        </CardContent>
      </Card>

      <Link href="/journal">
        <Card className="transition-colors hover:bg-surface-2">
          <CardHeader>
            <CardTitle>Journal</CardTitle>
          </CardHeader>
          <CardContent>
            {hydrated && todayJournal && todayJournal.behaviors.length > 0 ? (
              <p className="text-sm text-fg-muted">
                {todayJournal.behaviors.length} behavior{todayJournal.behaviors.length === 1 ? "" : "s"} logged
                {todayJournal.mood ? ` · mood ${todayJournal.mood}/5` : ""}.
                Tap to update.
              </p>
            ) : (
              <p className="text-sm text-fg-muted">
                Tap to log today&apos;s caffeine, alcohol, screen time, meditation… so we can correlate later.
              </p>
            )}
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function insightFor({
  hydrated,
  recovery,
  sleep,
  strain,
  workouts,
}: {
  hydrated: boolean;
  recovery: ReturnType<typeof selectLatestRecovery>;
  sleep: ReturnType<typeof selectLatestSleep>;
  strain: number;
  workouts: number;
}) {
  if (!hydrated) return "Loading…";
  if (!recovery && !sleep && workouts === 0) {
    return "Log a sleep entry and a morning HRV reading to start seeing your daily score.";
  }
  if (recovery && recovery.zone === "calibrating") {
    return "Recovery is calibrating — log a few more mornings to nail down your baseline.";
  }
  if (recovery?.zone === "high" && strain < 10) {
    return "Green recovery — your body can absorb a hard session today.";
  }
  if (recovery?.zone === "low" && strain > 12) {
    return "Red recovery and you've already pushed today — wind it down and sleep early.";
  }
  if (recovery?.zone === "high") return "Green recovery — push the strain today.";
  if (recovery?.zone === "mid") return "Moderate recovery — train, but don't max out.";
  if (recovery?.zone === "low") return "Red recovery — keep things light, prioritise sleep tonight.";
  if (sleep && sleep.performance < 60) {
    return "Short sleep last night. Take it easy until you have an HRV reading.";
  }
  if (workouts > 0 && !recovery) {
    return `Logged ${workouts} workout${workouts === 1 ? "" : "s"} (${strain.toFixed(1)} strain). Tomorrow morning, log HRV/RHR to see how your body responded.`;
  }
  return "Log this morning's HRV and RHR to get today's recovery score.";
}
