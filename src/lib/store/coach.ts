"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CoachRecommendation = { title: string; detail: string };

export type CoachInsight = {
  date: string;            // YYYY-MM-DD this insight was generated for
  headline: string;
  recommendations: CoachRecommendation[];
  strainTarget: string | null;
  generatedAt: string;     // ISO
};

type CoachStore = {
  byDate: Record<string, CoachInsight>;
  set: (insight: CoachInsight) => void;
  clear: () => void;
};

export const useCoachStore = create<CoachStore>()(
  persist(
    (set) => ({
      byDate: {},
      set: (insight) =>
        set((state) => ({ byDate: { ...state.byDate, [insight.date]: insight } })),
      clear: () => set({ byDate: {} }),
    }),
    {
      name: "woop.coach.v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const selectInsightFor = (date: string) => (s: CoachStore) => s.byDate[date];
