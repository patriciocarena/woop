"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRecoveryStore } from "@/lib/store/recovery";
import { Button } from "@/components/ui/button";
import { Input, Label, Field, HelperText } from "@/components/ui/input";

const schema = z.object({
  date: z.string().min(1),
  hrv: z.number().min(5).max(300),
  rhr: z.number().min(25).max(180),
  respiratoryRate: z.number().min(4).max(40).optional().or(z.literal(0).transform(() => undefined)),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

export function RecoveryEntryForm({ onSaved }: { onSaved?: () => void }) {
  const addEntry = useRecoveryStore((s) => s.addEntry);
  const [savedScore, setSavedScore] = useState<number | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: today, hrv: 60, rhr: 60, respiratoryRate: undefined, notes: "" },
  });

  const onSubmit = (values: FormValues) => {
    const entry = addEntry({
      date: values.date,
      hrv: values.hrv,
      rhr: values.rhr,
      respiratoryRate: values.respiratoryRate,
      notes: values.notes,
    });
    setSavedScore(entry.score);
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
          <Label htmlFor="hrv">HRV (ms)</Label>
          <Input
            id="hrv"
            type="number"
            step={1}
            min={5}
            max={300}
            {...form.register("hrv", { valueAsNumber: true })}
          />
          {form.formState.errors.hrv && <HelperText error>5–300 ms</HelperText>}
        </Field>
        <Field>
          <Label htmlFor="rhr">Resting HR (bpm)</Label>
          <Input
            id="rhr"
            type="number"
            step={1}
            min={25}
            max={180}
            {...form.register("rhr", { valueAsNumber: true })}
          />
          {form.formState.errors.rhr && <HelperText error>25–180 bpm</HelperText>}
        </Field>
        <Field>
          <Label htmlFor="rr">Respiratory rate (br/min, optional)</Label>
          <Input
            id="rr"
            type="number"
            step={0.5}
            min={0}
            max={40}
            {...form.register("respiratoryRate", { valueAsNumber: true, setValueAs: (v) => (v === "" || Number.isNaN(v) ? undefined : Number(v)) })}
          />
        </Field>
      </div>

      <Field>
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" placeholder="Optional — feeling, illness, training day..." {...form.register("notes")} />
      </Field>

      <HelperText>
        Tip: pull HRV/RHR from a free app like HRV4Training, Welltory or your phone&apos;s health app.
      </HelperText>

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>Save morning reading</Button>
        {savedScore !== null && (
          <span className="text-xs uppercase tracking-widest text-fg-muted">
            Saved · score {Math.round(savedScore)}
          </span>
        )}
      </div>
    </form>
  );
}
