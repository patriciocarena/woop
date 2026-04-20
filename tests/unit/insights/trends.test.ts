import { describe, expect, it } from "vitest";
import {
  buildDailySeries,
  addRollingMean,
  averageOver,
  weeklyAverages,
  mondayOf,
} from "@/lib/insights/trends";

describe("mondayOf", () => {
  it("returns the same date when input is a Monday", () => {
    // 2026-04-13 was a Monday
    expect(mondayOf("2026-04-13")).toBe("2026-04-13");
  });

  it("walks back to Monday for any weekday", () => {
    expect(mondayOf("2026-04-15")).toBe("2026-04-13"); // Wed
    expect(mondayOf("2026-04-19")).toBe("2026-04-13"); // Sun
  });
});

describe("buildDailySeries", () => {
  it("produces N consecutive days ending at endDate", () => {
    const out = buildDailySeries({
      days: 7,
      byDate: new Map(),
      endDate: "2026-04-19",
    });
    expect(out).toHaveLength(7);
    expect(out[0].date).toBe("2026-04-13");
    expect(out[6].date).toBe("2026-04-19");
  });

  it("fills missing days with the fill value", () => {
    const out = buildDailySeries({
      days: 3,
      byDate: new Map([["2026-04-19", 90]]),
      fillValue: 0,
      endDate: "2026-04-19",
    });
    expect(out.map((p) => p.value)).toEqual([0, 0, 90]);
  });
});

describe("addRollingMean", () => {
  it("attaches a 7-day rolling mean", () => {
    const series = [1, 2, 3, 4, 5, 6, 7].map((v, i) => ({
      date: `2026-04-${String(i + 1).padStart(2, "0")}`,
      value: v,
    }));
    const out = addRollingMean(series, 7);
    expect(out[6].ma7).toBeCloseTo(4); // mean of 1..7
  });
});

describe("averageOver", () => {
  it("can exclude zeros", () => {
    const series = [
      { date: "a", value: 0 }, { date: "b", value: 10 }, { date: "c", value: 20 },
    ];
    expect(averageOver(series)).toBeCloseTo(10);
    expect(averageOver(series, { excludeZeros: true })).toBeCloseTo(15);
  });
});

describe("weeklyAverages", () => {
  it("buckets into Mon-Sun weeks", () => {
    const series = [
      { date: "2026-04-13", value: 60 }, // Mon
      { date: "2026-04-14", value: 80 }, // Tue
      { date: "2026-04-20", value: 50 }, // next Mon
    ];
    const out = weeklyAverages(series);
    expect(out).toHaveLength(2);
    expect(out[0].weekStart).toBe("2026-04-13");
    expect(out[0].avg).toBe(70);
    expect(out[1].weekStart).toBe("2026-04-20");
    expect(out[1].avg).toBe(50);
  });
});
