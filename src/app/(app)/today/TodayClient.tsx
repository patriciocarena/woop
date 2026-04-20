"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecoveryRing, StrainRing, SleepRing } from "@/components/metrics/RecoveryRing";
import { useSleepStore, selectLatestSleep } from "@/lib/store/sleep";
import {
  useRecoveryStore,
  selectLatestRecovery,
  selectIsCalibrating,
} from "@/lib/store/recovery";
import { useHydrated } from "@/lib/hooks/use-hydrated";

export function TodayClient() {
  const hydrated = useHydrated();
  const latestSleep = useSleepStore(selectLatestSleep);
  const latestRecovery = useRecoveryStore(selectLatestRecovery);
  const calibrating = useRecoveryStore(selectIsCalibrating);

  // Strain still hard-coded — wired in Phase 4.
  const strain = 11.4;
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
        <Card className="flex flex-col items-center">
          <CardHeader className="w-full"><CardTitle>Strain</CardTitle></CardHeader>
          <StrainRing value={strain} size={140} />
        </Card>
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

      <Card>
        <CardHeader><CardTitle>Insight</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-fg-muted">{insightFor({ hydrated, recovery: latestRecovery, sleep: latestSleep })}</p>
        </CardContent>
      </Card>
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
}: {
  hydrated: boolean;
  recovery: ReturnType<typeof selectLatestRecovery>;
  sleep: ReturnType<typeof selectLatestSleep>;
}) {
  if (!hydrated) return "Loading…";
  if (!recovery && !sleep) {
    return "Log a sleep entry and a morning HRV reading to start seeing your daily score.";
  }
  if (recovery && recovery.zone === "calibrating") {
    return "Recovery is calibrating — log a few more mornings to nail down your baseline.";
  }
  if (recovery?.zone === "high") return "Green recovery — push the strain today.";
  if (recovery?.zone === "mid") return "Moderate recovery — train, but don't max out.";
  if (recovery?.zone === "low") return "Red recovery — keep things light, prioritise sleep tonight.";
  if (sleep && sleep.performance < 60) {
    return "Short sleep last night. Take it easy until you have an HRV reading.";
  }
  return "Log this morning's HRV and RHR to get today's recovery score.";
}
