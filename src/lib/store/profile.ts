"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Profile = {
  name?: string;
  /** 4-digit year. Used to estimate max HR (220 - age) if maxHr not set. */
  birthYear?: number;
  /** Optional personal max HR override. */
  maxHr?: number;
  /** Optional personal resting HR override. */
  restingHr?: number;
  /** Target nightly sleep in minutes. Defaults to 480 (8h). */
  sleepNeedMin?: number;
  /**
   * Usual wake time as "HH:MM" (24h). Used by the Sleep Coach to back-calculate
   * tonight's target bedtime. Defaults to "07:00" when not set.
   */
  wakeTime?: string;
  onboardingCompleted: boolean;
  onboardingCompletedAt?: string;
};

type ProfileStore = Profile & {
  set: (patch: Partial<Profile>) => void;
  completeOnboarding: () => void;
  reset: () => void;
};

const DEFAULT: Profile = {
  onboardingCompleted: false,
};

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      ...DEFAULT,
      set: (patch) => set((state) => ({ ...state, ...patch })),
      completeOnboarding: () =>
        set({ onboardingCompleted: true, onboardingCompletedAt: new Date().toISOString() }),
      reset: () => set(DEFAULT),
    }),
    {
      name: "woop:profile:v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Derived: max HR estimate, using override if set, else 220 - age. Returns undefined if neither is known. */
export function selectMaxHr(state: ProfileStore): number | undefined {
  if (state.maxHr) return state.maxHr;
  if (state.birthYear) return Math.max(120, 220 - (new Date().getFullYear() - state.birthYear));
  return undefined;
}
