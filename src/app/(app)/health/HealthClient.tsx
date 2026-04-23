"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VitalCard } from "@/components/health/VitalCard";
import { useRecoveryStore } from "@/lib/store/recovery";
import { useVitalsStore } from "@/lib/store/vitals";
import { useHydrated } from "@/lib/hooks/use-hydrated";

export function HealthClient() {
  const hydrated = useHydrated();

  // Subscribe to raw arrays — derive `{date, value}[]` slices via useMemo so
  // the children get stable references and we don't trip the React 19
  // getServerSnapshot loop. Same pattern Phase 12 standardised.
  const recoveryEntries = useRecoveryStore((s) => s.entries);
  const spo2 = useVitalsStore((s) => s.spo2);
  const wristTemp = useVitalsStore((s) => s.wristTemp);
  const walkingHr = useVitalsStore((s) => s.walkingHr);

  const hrvReadings = useMemo(
    () => recoveryEntries.map((e) => ({ date: e.date, value: e.hrv })),
    [recoveryEntries],
  );
  const rhrReadings = useMemo(
    () => recoveryEntries.map((e) => ({ date: e.date, value: e.rhr })),
    [recoveryEntries],
  );
  const respReadings = useMemo(
    () =>
      recoveryEntries
        .filter((e) => e.respiratoryRate !== undefined)
        .map((e) => ({ date: e.date, value: e.respiratoryRate as number })),
    [recoveryEntries],
  );

  if (!hydrated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vitals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-fg-muted text-center py-6">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  const hasAny =
    hrvReadings.length +
      rhrReadings.length +
      respReadings.length +
      spo2.length +
      wristTemp.length +
      walkingHr.length >
    0;

  if (!hasAny) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No vitals yet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-fg-muted">
          <p>
            Loggeá una entrada en{" "}
            <a className="underline text-fg" href="/recovery">
              Recovery
            </a>{" "}
            (HRV + RHR) o importá tu export de{" "}
            <a className="underline text-fg" href="/profile">
              Apple Health
            </a>{" "}
            para ver tus signos vitales acá.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <VitalCard
        title="HRV (SDNN)"
        unit="ms"
        readings={hrvReadings}
        format={(n) => n.toFixed(1)}
        hint="From your morning recovery log"
      />
      <VitalCard
        title="Resting HR"
        unit="bpm"
        readings={rhrReadings}
        format={(n) => Math.round(n).toString()}
        hint="From your morning recovery log"
      />
      <VitalCard
        title="Respiratory rate"
        unit="br/min"
        readings={respReadings}
        format={(n) => n.toFixed(1)}
        hint="From your morning recovery log"
      />
      <VitalCard
        title="Blood oxygen (SpO₂)"
        unit="%"
        readings={spo2}
        format={(n) => n.toFixed(1)}
        hint="Apple Health · daily mean"
      />
      <VitalCard
        title="Sleeping wrist temperature"
        unit="°C"
        readings={wristTemp}
        format={(n) => (n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2))}
        hint="Apple Health · delta from baseline"
      />
      <VitalCard
        title="Walking HR average"
        unit="bpm"
        readings={walkingHr}
        format={(n) => Math.round(n).toString()}
        hint="Apple Health · daily mean"
      />
    </div>
  );
}
