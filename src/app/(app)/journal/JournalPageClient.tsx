"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Field } from "@/components/ui/input";
import { BehaviorChecklist } from "@/components/journal/BehaviorChecklist";
import { JournalEntryForm } from "@/components/journal/JournalEntryForm";
import { JournalHistory } from "@/components/journal/JournalHistory";
import { useJournalStore, selectEntryByDate } from "@/lib/store/journal";
import { useHydrated } from "@/lib/hooks/use-hydrated";

export function JournalPageClient() {
  const hydrated = useHydrated();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const entry = useJournalStore(selectEntryByDate(date));

  const dayLabel = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>{dayLabel}</CardTitle>
            <p className="text-xs text-fg-dim mt-1">
              {hydrated && entry
                ? `${entry.behaviors.length} behaviors logged`
                : "No entry yet"}
            </p>
          </div>
          <Field>
            <Label htmlFor="journal-date">Date</Label>
            <Input
              id="journal-date"
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className="w-40"
            />
          </Field>
        </CardHeader>
        <CardContent className="space-y-6">
          <JournalEntryForm key={date} date={date} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Behaviors</CardTitle>
        </CardHeader>
        <CardContent>
          <BehaviorChecklist date={date} />
        </CardContent>
      </Card>

      {hydrated ? (
        <JournalHistory />
      ) : (
        <Card>
          <CardHeader><CardTitle>Last 7 days</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-fg-muted text-center py-6">Loading…</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
