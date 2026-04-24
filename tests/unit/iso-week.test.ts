import { describe, expect, it } from "vitest";
import { isoWeekOf, mondayOfIsoWeek, currentIsoWeek, periodLabel } from "@/lib/insights/iso-week";

describe("isoWeekOf", () => {
  it("returns correct ISO week for a known Monday", () => {
    // April 20 2026 is a Monday in week 17
    expect(isoWeekOf("2026-04-20")).toBe("2026-W17");
  });

  it("returns the same week for all days Mon–Sun", () => {
    const week = isoWeekOf("2026-04-20"); // Monday
    expect(isoWeekOf("2026-04-22")).toBe(week); // Wednesday
    expect(isoWeekOf("2026-04-26")).toBe(week); // Sunday
  });

  it("handles year boundary (Jan 1 2024 is in week 1 of 2024)", () => {
    // Jan 1 2024 is a Monday → week 1
    expect(isoWeekOf("2024-01-01")).toBe("2024-W01");
  });
});

describe("mondayOfIsoWeek", () => {
  it("returns the Monday of week 17, 2026", () => {
    expect(mondayOfIsoWeek("2026-W17")).toBe("2026-04-20");
  });

  it("round-trips: isoWeekOf(mondayOfIsoWeek(w)) === w", () => {
    const weeks = ["2026-W01", "2026-W17", "2026-W52", "2025-W01"];
    for (const w of weeks) {
      const monday = mondayOfIsoWeek(w);
      expect(monday).not.toBeNull();
      expect(isoWeekOf(monday!)).toBe(w);
    }
  });

  it("returns null for invalid formats", () => {
    expect(mondayOfIsoWeek("2026-04")).toBeNull();
    expect(mondayOfIsoWeek("not-a-week")).toBeNull();
    expect(mondayOfIsoWeek("2026-W99")).toBeNull();
  });
});

describe("currentIsoWeek", () => {
  it("returns a string matching YYYY-Www format", () => {
    expect(currentIsoWeek()).toMatch(/^\d{4}-W\d{2}$/);
  });
});

describe("periodLabel", () => {
  it("returns a non-empty label for a valid week", () => {
    const label = periodLabel("2026-W17");
    expect(label).toContain("2026");
    expect(label.length).toBeGreaterThan(5);
  });

  it("falls back to the raw string for invalid input", () => {
    expect(periodLabel("invalid")).toBe("invalid");
  });
});
