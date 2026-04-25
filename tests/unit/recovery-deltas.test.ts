import { describe, expect, it } from "vitest";
import {
  computeRecoveryDeltas,
  buildHrvBaselineSeries,
} from "@/lib/insights/recovery-deltas";
import type { RecoveryEntry } from "@/lib/store/recovery";

function entry(date: string, hrv: number, rhr: number): RecoveryEntry {
  return {
    id: date,
    date,
    hrv,
    rhr,
    score: 50,
    zone: "mid",
    createdAt: `${date}T07:00:00Z`,
  };
}

describe("computeRecoveryDeltas", () => {
  it("returns null for empty entries", () => {
    expect(computeRecoveryDeltas([])).toBeNull();
  });

  it("computes delta vs baseline of prior days", () => {
    // 5 days at HRV 60, RHR 55 → baseline mean 60/55. Today: HRV 70, RHR 50.
    const past = Array.from({ length: 5 }).map((_, i) =>
      entry(`2026-04-${String(10 + i).padStart(2, "0")}`, 60, 55),
    );
    const today = entry("2026-04-15", 70, 50);
    const deltas = computeRecoveryDeltas([...past, today]);
    expect(deltas).not.toBeNull();
    expect(deltas!.latest.date).toBe("2026-04-15");
    expect(deltas!.hrv.delta).toBeCloseTo(10, 1);
    expect(deltas!.rhr.delta).toBeCloseTo(-5, 1);
    // HRV +16.7%, RHR ~-9%
    expect(deltas!.hrv.deltaPct).toBeGreaterThan(15);
    expect(deltas!.rhr.deltaPct).toBeLessThan(-8);
  });

  it("z-score is capped at ±3", () => {
    const past = Array.from({ length: 10 }).map((_, i) =>
      entry(`2026-04-${String(10 + i).padStart(2, "0")}`, 60, 55),
    );
    // huge HRV outlier — would be a massive z-score
    const today = entry("2026-04-25", 200, 55);
    const deltas = computeRecoveryDeltas([...past, today]);
    expect(deltas!.hrv.z).toBeLessThanOrEqual(3);
    expect(deltas!.hrv.z).toBeGreaterThanOrEqual(-3);
  });

  it("baseline excludes the latest entry", () => {
    // If baseline included today, mean would equal current and delta=0.
    const today = entry("2026-04-20", 70, 50);
    const deltas = computeRecoveryDeltas([today]);
    // With only 1 entry, baseline n=0, mean=0 → deltaPct stays 0 (guard)
    expect(deltas!.hrv.deltaPct).toBe(0);
  });
});

describe("buildHrvBaselineSeries", () => {
  it("returns empty for empty input", () => {
    expect(buildHrvBaselineSeries([], 30)).toEqual([]);
  });

  it("emits one point per entry within the window", () => {
    const today = new Date();
    const entries = Array.from({ length: 5 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (4 - i));
      return entry(d.toISOString().slice(0, 10), 60 + i, 55);
    });
    const series = buildHrvBaselineSeries(entries, 30);
    expect(series).toHaveLength(5);
    expect(series[0].hrv).toBe(60);
    expect(series[4].hrv).toBe(64);
  });

  it("includes a bandRange tuple ready for Recharts range-area", () => {
    const today = new Date();
    const entries = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (5 - i));
      return entry(d.toISOString().slice(0, 10), 60, 55);
    });
    const series = buildHrvBaselineSeries(entries, 30);
    const last = series[series.length - 1];
    expect(Array.isArray(last.bandRange)).toBe(true);
    expect(last.bandRange).toHaveLength(2);
    expect(last.bandRange[0]).toBeLessThanOrEqual(last.bandRange[1]);
  });

  it("filters entries outside the window", () => {
    const old = entry("2020-01-01", 60, 55);
    const today = new Date().toISOString().slice(0, 10);
    const recent = entry(today, 70, 50);
    const series = buildHrvBaselineSeries([old, recent], 30);
    expect(series).toHaveLength(1);
    expect(series[0].date).toBe(today);
  });
});
