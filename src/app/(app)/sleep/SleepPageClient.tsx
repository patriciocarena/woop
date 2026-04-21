"use client";

import { SleepRing } from "@/components/metrics/RecoveryRing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SleepEntryForm } from "@/components/sleep/SleepEntryForm";
import { SleepBreakdown } from "@/components/sleep/SleepBreakdown";
import { SleepStagesBar } from "@/components/sleep/SleepStagesBar";
import { SleepHistory } from "@/components/sleep/SleepHistory";
import { useSleepStore, selectLatestSleep, selectLast7 } from "@/lib/store/sleep";
import { useHydrated } from "@/lib/hooks/use-hydrated";

export function SleepPageClient() {
  const hydrated = useHydrated();
  const latest = useSleepStore(selectLatestSleep);
  const last7 = useSleepStore(selectLast7);

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-2">
        <SleepRing value={hydrated && latest ? latest.performance : 0} size={220} />
        {hydrated && latest && (
          <p className="text-[11px] uppercase tracking-widest text-fg-dim">
            {new Date(`${latest.date}T00:00:00`).toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
        )}
      </div>

      {hydrated && latest && (
        <Card>
          <CardHeader><CardTitle>Last night</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {latest.stages && <SleepStagesBar stages={latest.stages} />}
            <SleepBreakdown session={latest} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Log a night</CardTitle></CardHeader>
        <CardContent>
          <SleepEntryForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Last 7 nights</CardTitle></CardHeader>
        <CardContent>
          {hydrated ? (
            <SleepHistory sessions={last7} />
          ) : (
            <p className="text-sm text-fg-muted text-center py-6">Loading…</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
