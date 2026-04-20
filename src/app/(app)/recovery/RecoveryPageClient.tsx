"use client";

import { RecoveryRing } from "@/components/metrics/RecoveryRing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecoveryEntryForm } from "@/components/recovery/RecoveryEntryForm";
import { RecoveryBreakdown } from "@/components/recovery/RecoveryBreakdown";
import { RecoveryHistory } from "@/components/recovery/RecoveryHistory";
import {
  useRecoveryStore,
  selectLatestRecovery,
  selectLast7Recovery,
  selectIsCalibrating,
} from "@/lib/store/recovery";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { MIN_BASELINE_SAMPLES } from "@/lib/scoring/recovery";

export function RecoveryPageClient() {
  const hydrated = useHydrated();
  const latest = useRecoveryStore(selectLatestRecovery);
  const last7 = useRecoveryStore(selectLast7Recovery);
  const calibrating = useRecoveryStore(selectIsCalibrating);
  const entryCount = useRecoveryStore((s) => s.entries.length);

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-2">
        <RecoveryRing value={hydrated && latest ? latest.score : 0} size={220} />
        {hydrated && calibrating && (
          <p className="text-[11px] uppercase tracking-widest text-fg-muted">
            Calibrating · {entryCount}/{MIN_BASELINE_SAMPLES} mornings logged
          </p>
        )}
        {hydrated && latest && !calibrating && (
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
          <CardHeader><CardTitle>Today&apos;s reading</CardTitle></CardHeader>
          <CardContent>
            <RecoveryBreakdown entry={latest} />
            {latest.notes && <p className="text-sm text-fg-muted pt-3">{latest.notes}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Log this morning</CardTitle></CardHeader>
        <CardContent>
          <RecoveryEntryForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Last 7 mornings</CardTitle></CardHeader>
        <CardContent>
          {hydrated ? (
            <RecoveryHistory entries={last7} />
          ) : (
            <p className="text-sm text-fg-muted text-center py-6">Loading…</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
