"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useStrainStore } from "@/lib/store/strain";
import { Button } from "@/components/ui/button";
import { Input, Label, Field, HelperText } from "@/components/ui/input";
import { strainBand } from "@/lib/scoring/strain";

const SPORTS = [
  "run", "walk", "ride", "lift", "swim", "yoga", "hiit", "sport", "other",
] as const;

const schema = z.object({
  date: z.string().min(1),
  sport: z.enum(SPORTS),
  startedAt: z.string().min(1),
  durationMin: z.number().int().min(1).max(600),
  avgHr: z.number().min(30).max(230).optional().or(z.nan().transform(() => undefined)),
  maxHr: z.number().min(30).max(230).optional().or(z.nan().transform(() => undefined)),
  perceivedRpe: z.number().int().min(1).max(10).optional().or(z.nan().transform(() => undefined)),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

export function WorkoutEntryForm({ onSaved }: { onSaved?: () => void }) {
  const addWorkout = useStrainStore((s) => s.addWorkout);
  const [savedStrain, setSavedStrain] = useState<number | null>(null);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const nowLocal = `${today}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: today,
      sport: "run",
      startedAt: nowLocal,
      durationMin: 45,
      avgHr: undefined,
      maxHr: undefined,
      perceivedRpe: undefined,
      notes: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    const startedAtIso = new Date(values.startedAt).toISOString();
    const w = addWorkout({
      date: values.date,
      sport: values.sport,
      startedAt: startedAtIso,
      durationMin: values.durationMin,
      avgHr: values.avgHr,
      maxHr: values.maxHr,
      perceivedRpe: values.perceivedRpe,
      notes: values.notes,
    });
    setSavedStrain(w.strain);
    form.reset({
      ...values,
      avgHr: undefined,
      maxHr: undefined,
      perceivedRpe: undefined,
      notes: "",
    });
    onSaved?.();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...form.register("date")} />
        </Field>
        <Field>
          <Label htmlFor="sport">Sport</Label>
          <select
            id="sport"
            className="h-10 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-white/20"
            {...form.register("sport")}
          >
            {SPORTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field>
          <Label htmlFor="startedAt">Started at</Label>
          <Input id="startedAt" type="datetime-local" {...form.register("startedAt")} />
        </Field>
        <Field>
          <Label htmlFor="durationMin">Duration (min)</Label>
          <Input
            id="durationMin"
            type="number"
            step={1}
            min={1}
            max={600}
            {...form.register("durationMin", { valueAsNumber: true })}
          />
          {form.formState.errors.durationMin && <HelperText error>1–600 min</HelperText>}
        </Field>
        <Field>
          <Label htmlFor="avgHr">Avg HR (optional)</Label>
          <Input
            id="avgHr"
            type="number"
            step={1}
            min={30}
            max={230}
            placeholder="e.g. 145"
            {...form.register("avgHr", { valueAsNumber: true })}
          />
          {form.formState.errors.avgHr && <HelperText error>30–230 bpm</HelperText>}
        </Field>
        <Field>
          <Label htmlFor="maxHr">Max HR (optional)</Label>
          <Input
            id="maxHr"
            type="number"
            step={1}
            min={30}
            max={230}
            placeholder="e.g. 178"
            {...form.register("maxHr", { valueAsNumber: true })}
          />
        </Field>
        <Field>
          <Label htmlFor="perceivedRpe">Perceived effort (1–10)</Label>
          <Input
            id="perceivedRpe"
            type="number"
            step={1}
            min={1}
            max={10}
            placeholder="Used if no HR"
            {...form.register("perceivedRpe", { valueAsNumber: true })}
          />
          {form.formState.errors.perceivedRpe && <HelperText error>1–10</HelperText>}
        </Field>
      </div>

      <Field>
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" placeholder="Optional — felt strong, easy z2, intervals..." {...form.register("notes")} />
      </Field>

      <HelperText>
        If you don&apos;t have HR, log perceived effort (Borg 1–10). The coach uses HR when available, RPE otherwise.
      </HelperText>

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>Log workout</Button>
        {savedStrain !== null && (
          <span className="text-xs uppercase tracking-widest text-fg-muted">
            Saved · {savedStrain.toFixed(1)} {strainBand(savedStrain)}
          </span>
        )}
      </div>
    </form>
  );
}
