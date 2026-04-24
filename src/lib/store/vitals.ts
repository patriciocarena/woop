"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Vitals store.
 *
 * Holds the importable health vitals that don't have manual entry surfaces:
 * SpO2 (%), sleeping wrist temperature delta (°C), walking HR average (bpm).
 *
 * These come exclusively from Apple Health import — there is no useful UX for
 * a human to type "my walking HR yesterday was 88." Cards on /health simply
 * hide when the matching array is empty.
 *
 * Storage shape: each vital is a sorted-by-date array of `{date, value}`. We
 * dedupe by date on insert (latest-write-wins for the same calendar day).
 */

export type VitalReading = {
  date: string;          // YYYY-MM-DD
  value: number;
};

export type VitalKey = "spo2" | "wristTemp" | "walkingHr" | "stressScore";

type VitalsStore = {
  spo2: VitalReading[];
  wristTemp: VitalReading[];
  walkingHr: VitalReading[];
  /** Daily stress score 1–3 derived from intra-day HR coefficient of variation. */
  stressScore: VitalReading[];
  /** Bulk-add readings for a single vital. New dates win over existing ones. */
  setReadings: (key: VitalKey, readings: VitalReading[]) => void;
  reset: () => void;
};

function mergeByDate(existing: VitalReading[], incoming: VitalReading[]): VitalReading[] {
  if (incoming.length === 0) return existing;
  const map = new Map<string, number>();
  for (const r of existing) map.set(r.date, r.value);
  for (const r of incoming) map.set(r.date, r.value); // last-write-wins per date
  return [...map.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const useVitalsStore = create<VitalsStore>()(
  persist(
    (set) => ({
      spo2: [],
      wristTemp: [],
      walkingHr: [],
      stressScore: [],

      setReadings: (key, readings) =>
        set((state) => ({ [key]: mergeByDate(state[key], readings) })),

      reset: () => set({ spo2: [], wristTemp: [], walkingHr: [], stressScore: [] }),
    }),
    {
      name: "woop:vitals:v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Last reading for a vital (most recent date). */
export function selectLatest(key: VitalKey) {
  return (state: VitalsStore): VitalReading | undefined => {
    const arr = state[key];
    return arr.length > 0 ? arr[arr.length - 1] : undefined;
  };
}
