"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProfileStore } from "@/lib/store/profile";
import { useHydrated } from "@/lib/hooks/use-hydrated";

export function ProfileSettings() {
  const hydrated = useHydrated();
  const profile = useProfileStore();
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(profile.name ?? "");
  const [birthYear, setBirthYear] = useState(profile.birthYear?.toString() ?? "");
  const [maxHr, setMaxHr] = useState(profile.maxHr?.toString() ?? "");
  const [restingHr, setRestingHr] = useState(profile.restingHr?.toString() ?? "");
  const [sleepHours, setSleepHours] = useState(
    profile.sleepNeedMin ? (profile.sleepNeedMin / 60).toString() : "",
  );

  if (!hydrated) {
    return (
      <Card>
        <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-fg-muted">Loading…</p></CardContent>
      </Card>
    );
  }

  function save() {
    const patch: Parameters<typeof profile.set>[0] = {
      name: name.trim() || undefined,
      birthYear: parseOptInt(birthYear, 1900, new Date().getFullYear()),
      maxHr: parseOptInt(maxHr, 120, 230),
      restingHr: parseOptInt(restingHr, 30, 120),
      sleepNeedMin: parseOptHoursToMin(sleepHours),
    };
    profile.set(patch);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <Card>
      <CardHeader><CardTitle>Personal baselines</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Field label="Nombre">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-fg"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Año nacimiento">
            <input
              type="number"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-fg"
            />
          </Field>
          <Field label="Sueño objetivo (h)">
            <input
              type="number"
              step="0.25"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-fg"
            />
          </Field>
          <Field label="FC máx (lpm)">
            <input
              type="number"
              value={maxHr}
              onChange={(e) => setMaxHr(e.target.value)}
              className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-fg"
            />
          </Field>
          <Field label="FC reposo (lpm)">
            <input
              type="number"
              value={restingHr}
              onChange={(e) => setRestingHr(e.target.value)}
              className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-fg"
            />
          </Field>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" onClick={save}>Guardar</Button>
          {saved && <span className="text-xs text-recovery-high">Guardado ✓</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm space-y-1">
      <span className="text-fg-muted text-[11px] uppercase tracking-widest">{label}</span>
      {children}
    </label>
  );
}

function parseOptInt(raw: string, min: number, max: number): number | undefined {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return Math.round(n);
}

function parseOptHoursToMin(raw: string): number | undefined {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 4 || n > 12) return undefined;
  return Math.round(n * 60);
}
