"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSleepStore } from "@/lib/store/sleep";
import { Button } from "@/components/ui/button";
import { Input, Label, Field, HelperText } from "@/components/ui/input";

const schema = z
  .object({
    date: z.string().min(1, "Pick a date"),
    bedtime: z.string().min(1, "Required"),
    wake: z.string().min(1, "Required"),
    asleepHours: z.number().min(0).max(14),
    disturbances: z.number().int().min(0).max(50),
    notes: z.string().max(500).optional(),
  })
  .refine((v) => combineDateTime(v.date, v.bedtime, v.wake).durationMin > 0, {
    message: "Wake time must be after bedtime",
    path: ["wake"],
  });

type FormValues = z.infer<typeof schema>;

export function SleepEntryForm({ onSaved }: { onSaved?: () => void }) {
  const addSession = useSleepStore((s) => s.addSession);
  const [savedScore, setSavedScore] = useState<number | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: today,
      bedtime: "23:00",
      wake: "07:00",
      asleepHours: 7.5,
      disturbances: 0,
      notes: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    const { startedAt, endedAt } = combineDateTime(values.date, values.bedtime, values.wake);
    const session = addSession({
      date: values.date,
      startedAt,
      endedAt,
      asleepMin: Math.round(values.asleepHours * 60),
      disturbances: values.disturbances,
      notes: values.notes,
    });
    setSavedScore(session.performance);
    onSaved?.();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <Label htmlFor="date">Wake date</Label>
          <Input id="date" type="date" {...form.register("date")} />
        </Field>
        <Field>
          <Label htmlFor="asleepHours">Hours asleep</Label>
          <Input
            id="asleepHours"
            type="number"
            step={0.25}
            min={0}
            max={14}
            {...form.register("asleepHours", { valueAsNumber: true })}
          />
        </Field>
        <Field>
          <Label htmlFor="bedtime">Bedtime</Label>
          <Input id="bedtime" type="time" {...form.register("bedtime")} />
        </Field>
        <Field>
          <Label htmlFor="wake">Wake time</Label>
          <Input id="wake" type="time" {...form.register("wake")} />
          {form.formState.errors.wake && (
            <HelperText error>{form.formState.errors.wake.message}</HelperText>
          )}
        </Field>
        <Field>
          <Label htmlFor="disturbances">Disturbances</Label>
          <Input
            id="disturbances"
            type="number"
            min={0}
            max={50}
            {...form.register("disturbances", { valueAsNumber: true })}
          />
        </Field>
      </div>

      <Field>
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" placeholder="Optional — woke up at 3am, etc." {...form.register("notes")} />
      </Field>

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Save sleep
        </Button>
        {savedScore !== null && (
          <span className="text-xs uppercase tracking-widest text-fg-muted">
            Saved · score {Math.round(savedScore)}
          </span>
        )}
      </div>
    </form>
  );
}

function combineDateTime(wakeDate: string, bedtime: string, wake: string) {
  // wakeDate refers to the day you got up. Bedtime may be the previous day.
  const [bH, bM] = bedtime.split(":").map(Number);
  const [wH, wM] = wake.split(":").map(Number);
  const wakeDt = new Date(`${wakeDate}T${wake}:00`);
  let bedDt = new Date(`${wakeDate}T${bedtime}:00`);
  // If bedtime is later in the day than wake, it must be the previous calendar day.
  if (bH * 60 + bM > wH * 60 + wM) {
    bedDt = new Date(bedDt.getTime() - 24 * 60 * 60 * 1000);
  }
  return {
    startedAt: bedDt.toISOString(),
    endedAt: wakeDt.toISOString(),
    durationMin: Math.round((wakeDt.getTime() - bedDt.getTime()) / 60_000),
  };
}
