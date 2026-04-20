"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecoveryRing, StrainRing, SleepRing } from "@/components/metrics/RecoveryRing";
import { useSleepStore, selectLatestSleep } from "@/lib/store/sleep";
import { useHydrated } from "@/lib/hooks/use-hydrated";

export function TodayClient() {
  const hydrated = useHydrated();
  const latestSleep = useSleepStore(selectLatestSleep);

  // Recovery & strain still hard-coded — wired up in Phases 3 & 4.
  const recovery = 72;
  const strain = 11.4;
  const sleep = hydrated && latestSleep ? latestSleep.performance : 0;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-fg-muted">Today</p>
        <h1 className="font-stat text-4xl mt-1">{greeting()}</h1>
      </header>

      <div className="flex justify-center">
        <RecoveryRing value={recovery} size={260} />
      </div>

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
          <p className="text-sm text-fg-muted">
            {hydrated && latestSleep
              ? sleepInsight(latestSleep.performance)
              : "Log last night's sleep to start seeing your daily score."}
          </p>
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

function sleepInsight(score: number) {
  if (score >= 85) return "Strong sleep — your recovery should match.";
  if (score >= 70) return "Solid night. A consistent bedtime would push you above 85%.";
  if (score >= 50) return "Decent, but you're carrying sleep debt. Aim earlier tonight.";
  return "Short night. Keep strain modest today and prioritise an early bedtime.";
}
