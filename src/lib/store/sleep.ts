"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { computeSleepNeed, computeSleepPerformance, computeSleepDebt, computeConsistency } from "@/lib/scoring/sleep";

export type SleepStages = {
  /** Light / Core sleep, in minutes. */
  coreMin: number;
  /** Deep / SWS, in minutes. */
  deepMin: number;
  /** REM, in minutes. */
  remMin: number;
  /** Awake during the night, in minutes. */
  awakeMin: number;
};

export type SleepSession = {
  id: string;
  /** ISO date (YYYY-MM-DD) — the *wake* date by Whoop convention. */
  date: string;
  /** ISO datetime when you got into bed. */
  startedAt: string;
  /** ISO datetime when you got up. */
  endedAt: string;
  /** Minutes in bed (computed but stored to avoid TZ surprises). */
  timeInBedMin: number;
  /** Minutes actually asleep (≤ timeInBedMin). */
  asleepMin: number;
  /** Number of awakenings. */
  disturbances: number;
  /** Cached performance score 0..100, computed at write time. */
  performance: number;
  /** Cached sleep need at write time, in minutes. */
  needMin: number;
  /** Per-stage breakdown when known (Apple Watch import or manual entry). */
  stages?: SleepStages;
  notes?: string;
  createdAt: string;
};

type SleepStore = {
  sessions: SleepSession[];
  addSession: (input: NewSleepInput) => SleepSession;
  removeSession: (id: string) => void;
  reset: () => void;
};

export type NewSleepInput = {
  date: string;
  startedAt: string;
  endedAt: string;
  asleepMin: number;
  disturbances?: number;
  stages?: SleepStages;
  notes?: string;
};

/**
 * Local-first store backed by localStorage. When Supabase auth lands in a later
 * phase we'll add a sync adapter — the public API of this store stays the same.
 */
export const useSleepStore = create<SleepStore>()(
  persist(
    (set, get) => ({
      sessions: [],

      addSession: (input) => {
        const timeInBedMin = Math.max(
          1,
          Math.round((new Date(input.endedAt).getTime() - new Date(input.startedAt).getTime()) / 60_000),
        );
        const asleepMin = Math.min(input.asleepMin, timeInBedMin);

        const previous = get().sessions
          .filter((s) => s.date < input.date)
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 7);

        const sleepDebtMin = computeSleepDebt(
          previous.map((s) => ({ needMin: s.needMin, asleepMin: s.asleepMin })),
        );
        const consistency = computeConsistency(
          previous.map((s) => bedtimeMinutesOfDay(s.startedAt)),
        );
        const needMin = computeSleepNeed({ sleepDebtMin });
        const { score } = computeSleepPerformance({
          asleepMin,
          needMin,
          timeInBedMin,
          consistency,
          stages: input.stages,
        });

        const session: SleepSession = {
          id: crypto.randomUUID(),
          date: input.date,
          startedAt: input.startedAt,
          endedAt: input.endedAt,
          timeInBedMin,
          asleepMin,
          disturbances: input.disturbances ?? 0,
          performance: score,
          needMin,
          stages: input.stages,
          notes: input.notes,
          createdAt: new Date().toISOString(),
        };

        set((state) => {
          const others = state.sessions.filter((s) => s.date !== input.date);
          return { sessions: [...others, session].sort((a, b) => a.date.localeCompare(b.date)) };
        });
        return session;
      },

      removeSession: (id) =>
        set((state) => ({ sessions: state.sessions.filter((s) => s.id !== id) })),

      reset: () => set({ sessions: [] }),
    }),
    {
      name: "woop:sleep:v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Selector: most recent session, or undefined. */
export function selectLatestSleep(state: SleepStore): SleepSession | undefined {
  return state.sessions[state.sessions.length - 1];
}

/** Selector: last 7 sessions in chronological order. */
export function selectLast7(state: SleepStore): SleepSession[] {
  return state.sessions.slice(-7);
}

function bedtimeMinutesOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}
