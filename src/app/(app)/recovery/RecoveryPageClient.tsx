"use client";

import { useMemo } from "react";
import { RecoveryRingStack } from "@/components/metrics/RecoveryRingStack";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecoveryEntryForm } from "@/components/recovery/RecoveryEntryForm";
import { RecoveryBreakdown } from "@/components/recovery/RecoveryBreakdown";
import { RecoveryHistory } from "@/components/recovery/RecoveryHistory";
import { HrvBaselineChart } from "@/components/recovery/HrvBaselineChart";
import {
  useRecoveryStore,
  selectLatestRecovery,
  selectIsCalibrating,
} from "@/lib/store/recovery";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { MIN_BASELINE_SAMPLES } from "@/lib/scoring/recovery";
import {
  computeRecoveryDeltas,
  buildHrvBaselineSeries,
} from "@/lib/insights/recovery-deltas";

export function RecoveryPageClient() {
  const hydrated = useHydrated();
  const latest = useRecoveryStore(selectLatestRecovery);
  const calibrating = useRecoveryStore(selectIsCalibrating);
  // Subscribe to raw array; derive slices via useMemo to avoid
  // React 19 getServerSnapshot loop from `slice(-7)` selector.
  const entries = useRecoveryStore((s) => s.entries);
  const last7 = useMemo(() => entries.slice(-7), [entries]);
  const deltas = useMemo(() => computeRecoveryDeltas(entries), [entries]);
  const hrvSeries = useMemo(() => buildHrvBaselineSeries(entries, 30), [entries]);
  const entryCount = entries.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-2">
        <RecoveryRingStack
          value={hydrated && latest ? latest.score : 0}
          hrvDeltaPct={hydrated && deltas && !calibrating ? deltas.hrv.deltaPct : null}
          rhrDeltaPct={hydrated && deltas && !calibrating ? deltas.rhr.deltaPct : null}
          size={240}
        />
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

      {hydrated && hrvSeries.length > 0 && (
        <HrvBaselineChart data={hrvSeries} windowLabel="30d" />
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
