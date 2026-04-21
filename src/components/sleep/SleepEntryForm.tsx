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
    knowsStages: z.boolean().optional(),
    deepHours: z.number().min(0).max(6).optional(),
    remHours: z.number().min(0).max(6).optional(),
    awakeMinutes: z.number().int().min(0).max(240).optional(),
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
      knowsStages: false,
      deepHours: 1.5,
      remHours: 1.5,
      awakeMinutes: 0,
    },
  });

  const knowsStages = form.watch("knowsStages");

  const onSubmit = (values: FormValues) => {
    const { startedAt, endedAt } = combineDateTime(values.date, values.bedtime, values.wake);
    const asleepMin = Math.round(values.asleepHours * 60);

    let stages: { coreMin: number; deepMin: number; remMin: number; awakeMin: number } | undefined;
    if (values.knowsStages) {
      const deepMin = Math.round((values.deepHours ?? 0) * 60);
      const remMin = Math.round((values.remHours ?? 0) * 60);
      const awakeMin = Math.round(values.awakeMinutes ?? 0);
      const coreMin = Math.max(0, asleepMin - deepMin - remMin);
      stages = { coreMin, deepMin, remMin, awakeMin };
    }

    const session = addSession({
      date: values.date,
      startedAt,
      endedAt,
      asleepMin,
      disturbances: values.disturbances,
      notes: values.notes,
      stages,
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

      <label className="flex items-center gap-2 text-sm text-fg-muted select-none">
        <input
          type="checkbox"
          {...form.register("knowsStages")}
          className="h-4 w-4 rounded border-border bg-surface-2"
        />
        <span>Conozco mis stages (REM/Deep/Awake)</span>
      </label>

      {knowsStages && (
        <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-surface-2 p-3">
          <Field>
            <Label htmlFor="deepHours">Deep (h)</Label>
            <Input
              id="deepHours"
              type="number"
              step={0.1}
              min={0}
              max={6}
              {...form.register("deepHours", { valueAsNumber: true })}
            />
          </Field>
          <Field>
            <Label htmlFor="remHours">REM (h)</Label>
            <Input
              id="remHours"
              type="number"
              step={0.1}
              min={0}
              max={6}
              {...form.register("remHours", { valueAsNumber: true })}
            />
          </Field>
          <Field>
            <Label htmlFor="awakeMinutes">Awake (min)</Label>
            <Input
              id="awakeMinutes"
              type="number"
              min={0}
              max={240}
              {...form.register("awakeMinutes", { valueAsNumber: true })}
            />
          </Field>
          <p className="col-span-3 text-[11px] text-fg-dim">
            El resto se asume Light (Core). Si no los conocés, dejá la opción sin tildar.
          </p>
        </div>
      )}

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
