import { describe, expect, it } from "vitest";
import { buildWeeklyAssessment } from "@/lib/insights/weekly";

describe("buildWeeklyAssessment", () => {
  it("returns null averages when there's no data", () => {
    const w = buildWeeklyAssessment({
      recovery: [], sleep: [], strain: [], journal: [],
      asOf: "2026-04-19",
    });
    expect(w.recoveryAvg).toBeNull();
    expect(w.sleepAvg).toBeNull();
    expect(w.strainAvg).toBeNull();
    expect(w.daysLogged).toBe(0);
    expect(w.highlights[0]).toMatch(/not enough data/i);
  });

  it("computes averages within the current week (Mon-Sun)", () => {
    const w = buildWeeklyAssessment({
      recovery: [
        { date: "2026-04-13", score: 70 }, // Mon
        { date: "2026-04-15", score: 60 }, // Wed
        { date: "2026-04-19", score: 80 }, // Sun
        { date: "2026-04-20", score: 50 }, // next Mon — should be excluded
      ],
      sleep: [
        { date: "2026-04-13", performance: 90 },
        { date: "2026-04-14", performance: 80 },
      ],
      strain: [{ date: "2026-04-15", strain: 14 }],
      journal: [],
      asOf: "2026-04-19",
    });
    expect(w.weekStart).toBe("2026-04-13");
    expect(w.weekEnd).toBe("2026-04-19");
    expect(w.recoveryAvg).toBe(70);
    expect(w.sleepAvg).toBe(85);
    expect(w.strainAvg).toBe(14);
    expect(w.daysLogged).toBe(3);
  });

  it("computes deltas vs previous week", () => {
    const w = buildWeeklyAssessment({
      recovery: [
        { date: "2026-04-06", score: 60 }, // prev Mon
        { date: "2026-04-13", score: 75 }, // this Mon
      ],
      sleep: [], strain: [], journal: [],
      asOf: "2026-04-13",
    });
    expect(w.recoveryAvg).toBe(75);
    expect(w.recoveryDelta).toBe(15);
  });

  it("ignores 0-strain days when computing strain average", () => {
    const w = buildWeeklyAssessment({
      recovery: [], sleep: [], journal: [],
      strain: [
        { date: "2026-04-13", strain: 0 },
        { date: "2026-04-14", strain: 12 },
      ],
      asOf: "2026-04-19",
    });
    expect(w.strainAvg).toBe(12);
  });

  it("surfaces top and worst behavior when impact data is rich enough", () => {
    const recovery: { date: string; score: number }[] = [];
    const journal: { date: string; behaviors: string[] }[] = [];
    // 4 alcohol days → 30, 4 meditation days → 80, 4 plain days → 60
    for (let i = 0; i < 4; i++) {
      const day = new Date(2026, 0, 1 + i).toISOString().slice(0, 10);
      const next = new Date(2026, 0, 2 + i).toISOString().slice(0, 10);
      journal.push({ date: day, behaviors: ["alcohol"] });
      recovery.push({ date: next, score: 30 });
    }
    for (let i = 0; i < 4; i++) {
      const day = new Date(2026, 1, 1 + i).toISOString().slice(0, 10);
      const next = new Date(2026, 1, 2 + i).toISOString().slice(0, 10);
      journal.push({ date: day, behaviors: ["meditation"] });
      recovery.push({ date: next, score: 80 });
    }
    for (let i = 0; i < 4; i++) {
      const day = new Date(2026, 2, 1 + i).toISOString().slice(0, 10);
      const next = new Date(2026, 2, 2 + i).toISOString().slice(0, 10);
      journal.push({ date: day, behaviors: [] });
      recovery.push({ date: next, score: 60 });
    }
    const w = buildWeeklyAssessment({
      recovery, sleep: [], strain: [], journal,
      asOf: "2026-04-19",
    });
    expect(w.topBehavior?.behaviorId).toBe("meditation");
    expect(w.worstBehavior?.behaviorId).toBe("alcohol");
  });
});
