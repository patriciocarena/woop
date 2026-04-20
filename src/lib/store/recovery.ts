"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  computeBaseline,
  computeRecovery,
  type RecoveryZone,
  BASELINE_WINDOW_DAYS,
  MIN_BASELINE_SAMPLES,
} from "@/lib/scoring/recovery";
import { useSleepStore } from "./sleep";

export type RecoveryEntry = {
  id: string;
  date: string;            // YYYY-MM-DD
  hrv: number;             // ms
  rhr: number;             // bpm
  respiratoryRate?: number;
  notes?: string;
  score: number;           // 0..100
  zone: RecoveryZone;
  createdAt: string;
};

type RecoveryStore = {
  entries: RecoveryEntry[];
  addEntry: (input: NewRecoveryInput) => RecoveryEntry;
  removeEntry: (id: string) => void;
  reset: () => void;
};

export type NewRecoveryInput = {
  date: string;
  hrv: number;
  rhr: number;
  respiratoryRate?: number;
  notes?: string;
};

export const useRecoveryStore = create<RecoveryStore>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (input) => {
        // Build baselines from previous entries (exclude today).
        const previous = get().entries
          .filter((e) => e.date < input.date)
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-BASELINE_WINDOW_DAYS);

        const baselines = {
          hrv: computeBaseline(previous.map((e) => e.hrv)),
          rhr: computeBaseline(previous.map((e) => e.rhr)),
          respiratory:
            previous.some((e) => e.respiratoryRate !== undefined) || input.respiratoryRate !== undefined
              ? computeBaseline(
                  previous
                    .map((e) => e.respiratoryRate)
                    .filter((v): v is number => v !== undefined),
                )
              : undefined,
        };

        // Pull last night's sleep score from the sleep store, if present.
        const sleepLastNight = useSleepStore
          .getState()
          .sessions.find((s) => s.date === input.date);

        const recovery = computeRecovery({
          hrv: input.hrv,
          rhr: input.rhr,
          respiratoryRate: input.respiratoryRate,
          sleepPerformance: sleepLastNight?.performance,
          baselines,
        });

        const entry: RecoveryEntry = {
          id: crypto.randomUUID(),
          date: input.date,
          hrv: input.hrv,
          rhr: input.rhr,
          respiratoryRate: input.respiratoryRate,
          notes: input.notes,
          score: recovery.score,
          zone: recovery.zone,
          createdAt: new Date().toISOString(),
        };

        set((state) => {
          const others = state.entries.filter((e) => e.date !== input.date);
          return { entries: [...others, entry].sort((a, b) => a.date.localeCompare(b.date)) };
        });
        return entry;
      },

      removeEntry: (id) =>
        set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),

      reset: () => set({ entries: [] }),
    }),
    {
      name: "woop:recovery:v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function selectLatestRecovery(state: RecoveryStore): RecoveryEntry | undefined {
  return state.entries[state.entries.length - 1];
}

export function selectLast7Recovery(state: RecoveryStore): RecoveryEntry[] {
  return state.entries.slice(-7);
}

export function selectIsCalibrating(state: RecoveryStore): boolean {
  return state.entries.length < MIN_BASELINE_SAMPLES;
}
