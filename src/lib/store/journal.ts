"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Mood = 1 | 2 | 3 | 4 | 5;

export type BehaviorCheck = {
  behaviorId: string;
  amount?: number;
};

export type JournalEntry = {
  id: string;
  date: string;            // YYYY-MM-DD
  mood?: Mood;
  notes?: string;
  behaviors: BehaviorCheck[];
  createdAt: string;
  updatedAt: string;
};

type JournalStore = {
  entries: JournalEntry[];
  upsertEntry: (input: UpsertJournalInput) => JournalEntry;
  toggleBehavior: (date: string, behaviorId: string, defaultAmount?: number) => void;
  setBehaviorAmount: (date: string, behaviorId: string, amount: number) => void;
  removeEntry: (id: string) => void;
  reset: () => void;
};

export type UpsertJournalInput = {
  date: string;
  mood?: Mood;
  notes?: string;
  behaviors?: BehaviorCheck[];
};

function ensureEntry(entries: JournalEntry[], date: string): JournalEntry {
  const existing = entries.find((e) => e.date === date);
  if (existing) return existing;
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    date,
    behaviors: [],
    createdAt: now,
    updatedAt: now,
  };
}

export const useJournalStore = create<JournalStore>()(
  persist(
    (set) => ({
      entries: [],

      upsertEntry: (input) => {
        let result: JournalEntry | null = null;
        set((state) => {
          const others = state.entries.filter((e) => e.date !== input.date);
          const base = ensureEntry(state.entries, input.date);
          const updated: JournalEntry = {
            ...base,
            mood: input.mood ?? base.mood,
            notes: input.notes ?? base.notes,
            behaviors: input.behaviors ?? base.behaviors,
            updatedAt: new Date().toISOString(),
          };
          result = updated;
          return {
            entries: [...others, updated].sort((a, b) => a.date.localeCompare(b.date)),
          };
        });
        return result!;
      },

      toggleBehavior: (date, behaviorId, defaultAmount) => {
        set((state) => {
          const others = state.entries.filter((e) => e.date !== date);
          const base = ensureEntry(state.entries, date);
          const has = base.behaviors.some((b) => b.behaviorId === behaviorId);
          const nextBehaviors = has
            ? base.behaviors.filter((b) => b.behaviorId !== behaviorId)
            : [...base.behaviors, { behaviorId, amount: defaultAmount }];
          const updated: JournalEntry = {
            ...base,
            behaviors: nextBehaviors,
            updatedAt: new Date().toISOString(),
          };
          return {
            entries: [...others, updated].sort((a, b) => a.date.localeCompare(b.date)),
          };
        });
      },

      setBehaviorAmount: (date, behaviorId, amount) => {
        set((state) => {
          const others = state.entries.filter((e) => e.date !== date);
          const base = ensureEntry(state.entries, date);
          const exists = base.behaviors.some((b) => b.behaviorId === behaviorId);
          const nextBehaviors = exists
            ? base.behaviors.map((b) =>
                b.behaviorId === behaviorId ? { ...b, amount } : b,
              )
            : [...base.behaviors, { behaviorId, amount }];
          const updated: JournalEntry = {
            ...base,
            behaviors: nextBehaviors,
            updatedAt: new Date().toISOString(),
          };
          return {
            entries: [...others, updated].sort((a, b) => a.date.localeCompare(b.date)),
          };
        });
      },

      removeEntry: (id) =>
        set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),

      reset: () => set({ entries: [] }),
    }),
    {
      name: "woop:journal:v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// ─── selectors ───────────────────────────────────────────────────────────
//
// `find` selectors are reference-stable (same row → same ref). The `slice`
// selector below is NOT — see deprecation note. The factory selectors
// (`selectEntryByDate(date)`) are also fine for `useStore` because the
// underlying `find` returns the same object reference between renders.

export function selectEntryByDate(date: string) {
  return (state: JournalStore): JournalEntry | undefined =>
    state.entries.find((e) => e.date === date);
}

/** @deprecated Same caveat as `selectTodayWorkouts` — derive via useMemo
 *  in components. Safe in pure builders. */
export function selectTodayEntry(state: JournalStore): JournalEntry | undefined {
  const today = new Date().toISOString().slice(0, 10);
  return state.entries.find((e) => e.date === today);
}

/** @deprecated `slice` builds a fresh array each call. Subscribe to
 *  `s.entries` and derive with `useMemo`. Safe in pure builders. */
export function selectLast7Entries(state: JournalStore): JournalEntry[] {
  return state.entries.slice(-7);
}
