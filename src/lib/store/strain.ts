"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  workoutStrain,
  workoutTRIMP,
  dayStrain,
  type Sport,
  type WorkoutInput,
} from "@/lib/scoring/strain";

export type Workout = {
  id: string;
  date: string;            // YYYY-MM-DD
  sport: Sport;
  startedAt: string;       // ISO
  durationMin: number;
  avgHr?: number;
  maxHr?: number;
  perceivedRpe?: number;
  notes?: string;
  trimp: number;
  strain: number;          // 0..21 single-workout
  createdAt: string;
};

export type NewWorkoutInput = {
  date: string;
  sport: Sport;
  startedAt: string;
  durationMin: number;
  avgHr?: number;
  maxHr?: number;
  perceivedRpe?: number;
  notes?: string;
};

type StrainStore = {
  workouts: Workout[];
  addWorkout: (input: NewWorkoutInput) => Workout;
  removeWorkout: (id: string) => void;
  reset: () => void;
};

export const useStrainStore = create<StrainStore>()(
  persist(
    (set) => ({
      workouts: [],

      addWorkout: (input) => {
        const w: WorkoutInput = {
          durationMin: input.durationMin,
          avgHr: input.avgHr,
          maxHr: input.maxHr,
          perceivedRpe: input.perceivedRpe,
          sport: input.sport,
        };
        const trimp = workoutTRIMP(w);
        const strain = workoutStrain(w);

        const workout: Workout = {
          id: crypto.randomUUID(),
          date: input.date,
          sport: input.sport,
          startedAt: input.startedAt,
          durationMin: input.durationMin,
          avgHr: input.avgHr,
          maxHr: input.maxHr,
          perceivedRpe: input.perceivedRpe,
          notes: input.notes,
          trimp,
          strain,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          workouts: [...state.workouts, workout].sort((a, b) =>
            a.startedAt.localeCompare(b.startedAt),
          ),
        }));
        return workout;
      },

      removeWorkout: (id) =>
        set((state) => ({ workouts: state.workouts.filter((w) => w.id !== id) })),

      reset: () => set({ workouts: [] }),
    }),
    {
      name: "woop:strain:v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// ─── selectors ───────────────────────────────────────────────────────────
//
// IMPORTANT — DO NOT pass the *Today* / *Last7* / *DayStrain* selectors
// directly to `useStrainStore(...)`. They build a NEW array/object on every
// call, which trips React 19's `useSyncExternalStore` reference check and
// produces an infinite "getServerSnapshot should be cached" warning.
//
// In components: subscribe to the raw `workouts` array and derive with
// `useMemo` (see TodayClient.tsx, StrainPageClient.tsx).
// In pure builders / non-React code (build-context.ts, weekly insights):
// these selectors are fine — call once, throw away.

export function selectWorkoutsByDate(date: string) {
  return (state: StrainStore) =>
    state.workouts.filter((w) => w.date === date);
}

/** @deprecated Do not pass to `useStrainStore(...)` — returns a new array
 *  each call and triggers React 19 getServerSnapshot loop. Subscribe to
 *  `s.workouts` and filter with `useMemo`. Safe in pure builders. */
export function selectTodayWorkouts(state: StrainStore): Workout[] {
  const today = new Date().toISOString().slice(0, 10);
  return state.workouts.filter((w) => w.date === today);
}

export function selectDayStrain(date: string) {
  return (state: StrainStore) => {
    const workouts = state.workouts.filter((w) => w.date === date);
    return dayStrain({
      workouts: workouts.map((w) => ({
        durationMin: w.durationMin,
        avgHr: w.avgHr,
        maxHr: w.maxHr,
        perceivedRpe: w.perceivedRpe,
      })),
    });
  };
}

/** @deprecated Same caveat as `selectTodayWorkouts` — derive via useMemo
 *  in components. Safe in pure builders. */
export function selectTodayStrain(state: StrainStore): number {
  const today = new Date().toISOString().slice(0, 10);
  return selectDayStrain(today)(state);
}

/** @deprecated Builds a fresh 7-day array on every call. Subscribe to
 *  `s.workouts` and derive with `useMemo` (see StrainHistory.tsx). */
export function selectLast7DaysStrain(state: StrainStore): { date: string; strain: number }[] {
  const days: { date: string; strain: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    days.push({ date, strain: selectDayStrain(date)(state) });
  }
  return days;
}
