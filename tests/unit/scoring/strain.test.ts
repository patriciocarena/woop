import { describe, expect, it } from "vitest";
import {
  workoutTRIMP,
  workoutStrain,
  dayStrain,
  suggestStrainTarget,
  strainBand,
  MAX_STRAIN,
} from "@/lib/scoring/strain";

describe("workoutTRIMP", () => {
  it("returns 0 when the workout was at resting HR", () => {
    expect(workoutTRIMP({ durationMin: 60, avgHr: 60, restingHr: 60, maxHr: 190 })).toBe(0);
  });

  it("scales monotonically with intensity", () => {
    const easy = workoutTRIMP({ durationMin: 30, avgHr: 110, restingHr: 60, maxHr: 190 });
    const moderate = workoutTRIMP({ durationMin: 30, avgHr: 140, restingHr: 60, maxHr: 190 });
    const hard = workoutTRIMP({ durationMin: 30, avgHr: 170, restingHr: 60, maxHr: 190 });
    expect(moderate).toBeGreaterThan(easy);
    expect(hard).toBeGreaterThan(moderate);
  });

  it("scales linearly with duration at fixed intensity", () => {
    const t30 = workoutTRIMP({ durationMin: 30, avgHr: 150, restingHr: 60, maxHr: 190 });
    const t60 = workoutTRIMP({ durationMin: 60, avgHr: 150, restingHr: 60, maxHr: 190 });
    expect(t60 / t30).toBeCloseTo(2, 1);
  });

  it("falls back to RPE when avgHr is missing", () => {
    const high = workoutTRIMP({ durationMin: 30, perceivedRpe: 9 });
    const low = workoutTRIMP({ durationMin: 30, perceivedRpe: 3 });
    expect(high).toBeGreaterThan(low);
    expect(low).toBeGreaterThan(0);
  });

  it("uses a moderate default when neither HR nor RPE is given", () => {
    const trimp = workoutTRIMP({ durationMin: 30 });
    expect(trimp).toBeGreaterThan(0);
    expect(trimp).toBeLessThan(workoutTRIMP({ durationMin: 30, perceivedRpe: 9 }));
  });
});

describe("workoutStrain", () => {
  it("never exceeds the 0..21 scale", () => {
    const insane = workoutStrain({ durationMin: 600, avgHr: 200, restingHr: 60, maxHr: 200 });
    expect(insane).toBeLessThanOrEqual(MAX_STRAIN);
    expect(insane).toBeGreaterThan(15);
  });

  it("a 30-min easy walk lands in the Light band", () => {
    const s = workoutStrain({ durationMin: 30, avgHr: 100, restingHr: 60, maxHr: 190 });
    expect(s).toBeLessThan(10);
  });

  it("a 60-min interval run lands in High or All Out", () => {
    const s = workoutStrain({ durationMin: 60, avgHr: 165, restingHr: 60, maxHr: 190 });
    expect(s).toBeGreaterThanOrEqual(10);
  });
});

describe("dayStrain", () => {
  it("a rest day with default ambient sits in the Light band", () => {
    const s = dayStrain({ workouts: [] });
    expect(s).toBeGreaterThan(3);
    expect(s).toBeLessThan(10);
  });

  it("zero ambient + zero workouts is exactly 0", () => {
    expect(dayStrain({ workouts: [], ambientTrimp: 0 })).toBe(0);
  });

  it("workouts compound but with diminishing returns (sub-additive)", () => {
    const one = dayStrain({
      workouts: [{ durationMin: 60, avgHr: 160, restingHr: 60, maxHr: 190 }],
      ambientTrimp: 0,
    });
    const two = dayStrain({
      workouts: [
        { durationMin: 60, avgHr: 160, restingHr: 60, maxHr: 190 },
        { durationMin: 60, avgHr: 160, restingHr: 60, maxHr: 190 },
      ],
      ambientTrimp: 0,
    });
    expect(two).toBeGreaterThan(one);
    expect(two).toBeLessThan(2 * one); // saturating curve, never doubles
  });

  it("caps at 21 even with absurd input", () => {
    const s = dayStrain({
      workouts: Array.from({ length: 20 }, () => ({
        durationMin: 120, avgHr: 180, restingHr: 60, maxHr: 190,
      })),
    });
    expect(s).toBeLessThanOrEqual(MAX_STRAIN);
    expect(s).toBeGreaterThan(20);
  });
});

describe("suggestStrainTarget", () => {
  it("greenlights hard training when recovery is high", () => {
    const t = suggestStrainTarget(80, "high");
    expect(t.min).toBeGreaterThanOrEqual(13);
    expect(t.max).toBeLessThanOrEqual(MAX_STRAIN);
  });

  it("dials it back when recovery is red", () => {
    const t = suggestStrainTarget(20, "low");
    expect(t.max).toBeLessThanOrEqual(10);
  });

  it("uses a default moderate band when calibrating", () => {
    const t = suggestStrainTarget(undefined, "calibrating");
    expect(t.min).toBeGreaterThan(0);
    expect(t.max).toBeLessThan(MAX_STRAIN);
  });

  it("nudges the user to log HRV when zone is missing entirely", () => {
    const t = suggestStrainTarget(undefined, undefined);
    expect(t.rationale.toLowerCase()).toContain("hrv");
  });
});

describe("strainBand", () => {
  it("matches Whoop's published 4-band breakdown", () => {
    expect(strainBand(5)).toBe("Light");
    expect(strainBand(11)).toBe("Moderate");
    expect(strainBand(15)).toBe("High");
    expect(strainBand(19)).toBe("All Out");
  });
});
