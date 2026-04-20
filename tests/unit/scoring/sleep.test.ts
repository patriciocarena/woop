import { describe, expect, it } from "vitest";
import {
  computeSleepNeed,
  computeSleepPerformance,
  computeSleepDebt,
  computeConsistency,
} from "@/lib/scoring/sleep";

describe("computeSleepNeed", () => {
  it("returns the 8h baseline when no debt, strain or naps", () => {
    expect(computeSleepNeed({})).toBe(480);
  });

  it("adds a strain bonus only above strain 10", () => {
    expect(computeSleepNeed({ strainYesterday: 10 })).toBe(480);
    // 11 strain → 6 extra minutes
    expect(computeSleepNeed({ strainYesterday: 11 })).toBe(486);
    // 18 strain → 8 * 6 = 48 extra
    expect(computeSleepNeed({ strainYesterday: 18 })).toBe(528);
  });

  it("recovers half of accumulated sleep debt", () => {
    expect(computeSleepNeed({ sleepDebtMin: 120 })).toBe(540);
  });

  it("subtracts naps with diminishing returns past 60 min", () => {
    expect(computeSleepNeed({ napMin: 30 })).toBe(450);
    // 90 min nap → 60 + (30 * 0.5) = 75 credit
    expect(computeSleepNeed({ napMin: 90 })).toBe(405);
  });

  it("clamps to a [5h, 11h] range", () => {
    expect(computeSleepNeed({ sleepDebtMin: 9999 })).toBe(660);
    expect(computeSleepNeed({ napMin: 9999 })).toBe(300);
  });
});

describe("computeSleepPerformance", () => {
  it("returns 100 when you hit need with perfect efficiency and consistency", () => {
    const r = computeSleepPerformance({
      asleepMin: 480,
      needMin: 480,
      timeInBedMin: 480,
      consistency: 1,
    });
    expect(r.score).toBe(100);
    expect(r.parts.duration).toBe(100);
    expect(r.parts.efficiency).toBe(100);
  });

  it("weights duration most heavily (~70%)", () => {
    // Slept 50% of need, perfect efficiency & consistency
    const r = computeSleepPerformance({
      asleepMin: 240,
      needMin: 480,
      timeInBedMin: 240,
      consistency: 1,
    });
    // 50*0.7 + 100*0.2 + 100*0.1 = 35 + 20 + 10 = 65
    expect(r.score).toBe(65);
  });

  it("treats unknown consistency as a 100% pass-through (no penalty)", () => {
    const withConsistency = computeSleepPerformance({
      asleepMin: 420,
      needMin: 480,
      timeInBedMin: 480,
      consistency: 1,
    });
    const withoutConsistency = computeSleepPerformance({
      asleepMin: 420,
      needMin: 480,
      timeInBedMin: 480,
    });
    expect(withConsistency.score).toBe(withoutConsistency.score);
  });

  it("penalises low efficiency (lots of time in bed not asleep)", () => {
    const r = computeSleepPerformance({
      asleepMin: 360,    // 6h asleep
      needMin: 480,      // wanted 8h
      timeInBedMin: 540, // 9h in bed → eff = 67%
      consistency: 1,
    });
    // duration 75, efficiency 66.67, consistency 100
    // 75*0.7 + 66.67*0.2 + 100*0.1 = 52.5 + 13.33 + 10 = 75.8
    expect(r.parts.efficiency).toBeCloseTo(66.7, 1);
    expect(r.score).toBeCloseTo(75.8, 0);
  });
});

describe("computeSleepDebt", () => {
  it("sums positive shortfalls, ignores nights you over-slept", () => {
    const debt = computeSleepDebt([
      { needMin: 480, asleepMin: 420 }, // -60
      { needMin: 480, asleepMin: 510 }, // surplus → 0
      { needMin: 480, asleepMin: 360 }, // -120
    ]);
    expect(debt).toBe(180);
  });

  it("returns 0 for an empty window", () => {
    expect(computeSleepDebt([])).toBe(0);
  });
});

describe("computeConsistency", () => {
  it("returns undefined under 3 sessions", () => {
    expect(computeConsistency([])).toBeUndefined();
    expect(computeConsistency([1380, 1390])).toBeUndefined();
  });

  it("returns ~1 when bedtimes are tightly clustered", () => {
    // All within 10 minutes of 23:00
    const c = computeConsistency([1380, 1385, 1390, 1383]);
    expect(c).toBeGreaterThan(0.99);
  });

  it("handles bedtimes that wrap past midnight", () => {
    // 23:50, 00:10, 00:00 — should be tightly clustered, not erratic
    const c = computeConsistency([1430, 10, 0, 1450]);
    expect(c).toBeGreaterThan(0.95);
  });

  it("returns a low score for erratic bedtimes", () => {
    // Truly uniform around the 24h clock: 00:00, 06:00, 12:00, 18:00
    const c = computeConsistency([0, 360, 720, 1080]);
    expect(c).toBeLessThan(0.05);
  });
});
