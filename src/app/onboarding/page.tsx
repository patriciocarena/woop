"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProfileStore } from "@/lib/store/profile";
import { cn } from "@/lib/utils";

type Step = 0 | 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const router = useRouter();
  const profile = useProfileStore();
  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState(profile.name ?? "");
  const [birthYear, setBirthYear] = useState<string>(profile.birthYear?.toString() ?? "");
  const [restingHr, setRestingHr] = useState<string>(profile.restingHr?.toString() ?? "");
  const [sleepHours, setSleepHours] = useState<string>(
    profile.sleepNeedMin ? (profile.sleepNeedMin / 60).toString() : "8",
  );

  function finish() {
    const patch: Parameters<typeof profile.set>[0] = {};
    if (name.trim()) patch.name = name.trim();
    const by = Number(birthYear);
    if (Number.isFinite(by) && by >= 1900 && by <= new Date().getFullYear()) patch.birthYear = by;
    const rhr = Number(restingHr);
    if (Number.isFinite(rhr) && rhr >= 30 && rhr <= 120) patch.restingHr = rhr;
    const hrs = Number(sleepHours);
    if (Number.isFinite(hrs) && hrs >= 4 && hrs <= 12) patch.sleepNeedMin = Math.round(hrs * 60);
    profile.set(patch);
    profile.completeOnboarding();
    router.replace("/today");
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 bg-bg">
      <div className="w-full max-w-md space-y-6">
        <div className="flex gap-1 justify-center">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={cn("h-1 w-10 rounded-full transition-colors", i <= step ? "bg-fg" : "bg-surface-2")}
            />
          ))}
        </div>

        {step === 0 && (
          <Card>
            <CardHeader><CardTitle>Welcome to Woop</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-fg-muted">
                A personal recovery, strain and sleep tracker inspired by Whoop — without the wearable.
                You log morning HRV + RHR, workouts, and daily behaviors; Woop calculates your readiness
                and shows patterns over time.
              </p>
              <p className="text-sm text-fg-muted">This takes about 60 seconds.</p>
              <Button className="w-full" onClick={() => setStep(1)}>Empezar</Button>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader><CardTitle>¿Cómo te llamás?</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-fg placeholder:text-fg-dim"
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1">Atrás</Button>
                <Button onClick={() => setStep(2)} className="flex-1">Siguiente</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader><CardTitle>Tus baselines</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-fg-muted">
                Usamos tu edad para estimar tu FC máxima (220 - edad). Si ya conocés tu FC en reposo, también.
                Todo es opcional y editable después.
              </p>
              <label className="block text-sm space-y-1">
                <span className="text-fg-muted text-xs uppercase tracking-widest">Año de nacimiento</span>
                <input
                  type="number"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  placeholder="1995"
                  min={1900}
                  max={new Date().getFullYear()}
                  className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-fg placeholder:text-fg-dim"
                />
              </label>
              <label className="block text-sm space-y-1">
                <span className="text-fg-muted text-xs uppercase tracking-widest">FC en reposo (opcional)</span>
                <input
                  type="number"
                  value={restingHr}
                  onChange={(e) => setRestingHr(e.target.value)}
                  placeholder="58"
                  min={30}
                  max={120}
                  className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-fg placeholder:text-fg-dim"
                />
              </label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Atrás</Button>
                <Button onClick={() => setStep(3)} className="flex-1">Siguiente</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader><CardTitle>Tu objetivo de sueño</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-fg-muted">
                Cuántas horas necesitás dormir idealmente. Woop ajusta tu necesidad cada noche según strain y sleep debt.
              </p>
              <label className="block text-sm space-y-1">
                <span className="text-fg-muted text-xs uppercase tracking-widest">Horas por noche</span>
                <input
                  type="number"
                  step="0.25"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  min={4}
                  max={12}
                  className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-fg"
                />
              </label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Atrás</Button>
                <Button onClick={() => setStep(4)} className="flex-1">Siguiente</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader><CardTitle>Cómo medir HRV sin pulsera</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-fg-muted">
                Si no tenés un wearable que mida HRV, podés usar apps gratuitas con la cámara del teléfono:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="rounded-lg bg-surface-2 px-3 py-2">
                  <span className="font-medium">HRV4Training</span>{" "}
                  <span className="text-fg-muted">(iOS/Android, 1-2 min en la mañana)</span>
                </li>
                <li className="rounded-lg bg-surface-2 px-3 py-2">
                  <span className="font-medium">Welltory</span>{" "}
                  <span className="text-fg-muted">(iOS/Android, toma RMSSD/SDNN)</span>
                </li>
              </ul>
              <p className="text-xs text-fg-dim">
                Apuntá el valor HRV (ms) y FC en reposo (lpm). Lo cargás en Recovery cada mañana y listo.
              </p>
              <Button className="w-full" onClick={finish}>Empezar a usar Woop</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
