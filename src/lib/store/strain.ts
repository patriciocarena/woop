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

export function selectWorkoutsByDate(date: string) {
  return (state: StrainStore) =>
    state.workouts.filter((w) => w.date === date);
}

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

export function selectTodayStrain(state: StrainStore): number {
  const today = new Date().toISOString().slice(0, 10);
  return selectDayStrain(today)(state);
}

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
