"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Field, HelperText } from "@/components/ui/input";
import {
  useJournalStore,
  selectEntryByDate,
  type Mood,
} from "@/lib/store/journal";
import { cn } from "@/lib/utils";

const MOOD_LABELS: Record<Mood, string> = {
  1: "🙁 Off",
  2: "😐 Meh",
  3: "🙂 Ok",
  4: "😄 Good",
  5: "🤩 Great",
};

// Parent re-mounts via key={date}, so initial state from the store is the
// only state we need — no useEffect mirroring required.
export function JournalEntryForm({ date }: { date: string }) {
  const upsertEntry = useJournalStore((s) => s.upsertEntry);
  const initial = useJournalStore.getState().entries.find((e) => e.date === date);
  const _liveEntry = useJournalStore(selectEntryByDate(date)); // subscribe so re-renders propagate
  void _liveEntry;

  const [mood, setMood] = useState<Mood | undefined>(initial?.mood);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const onSave = () => {
    upsertEntry({ date, mood, notes: notes.trim() || undefined });
    setSavedAt(new Date().toLocaleTimeString());
  };

  return (
    <div className="space-y-4">
      <Field>
        <Label>How did today feel?</Label>
        <div className="flex flex-wrap gap-2">
          {([1, 2, 3, 4, 5] as Mood[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(m === mood ? undefined : m)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                m === mood
                  ? "border-fg bg-fg text-bg"
                  : "border-border bg-surface-2 text-fg-muted hover:bg-surface-1",
              )}
              aria-pressed={m === mood}
            >
              {MOOD_LABELS[m]}
            </button>
          ))}
        </div>
      </Field>

      <Field>
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          placeholder="Energy, mindset, anything notable…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <HelperText>Optional — kept private to your device for now.</HelperText>
      </Field>

      <div className="flex items-center justify-between gap-3 pt-1">
        <Button type="button" onClick={onSave}>Save</Button>
        {savedAt && (
          <span className="text-xs uppercase tracking-widest text-fg-muted">
            Saved · {savedAt}
          </span>
        )}
      </div>
    </div>
  );
}
