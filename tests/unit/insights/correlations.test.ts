import { describe, expect, it } from "vitest";
import { behaviorImpacts } from "@/lib/insights/correlations";

function r(date: string, score: number) {
  return { date, score };
}
function j(date: string, behaviors: string[]) {
  return { date, behaviors };
}

describe("behaviorImpacts", () => {
  it("returns empty array when there's no overlap", () => {
    const out = behaviorImpacts({
      recovery: [r("2026-04-01", 70)],
      journal: [j("2026-03-25", ["alcohol"])],
    });
    expect(out).toEqual([]);
  });

  it("ignores behaviors with too few samples", () => {
    // alcohol only on 2 days, threshold is 3
    const recovery = Array.from({ length: 10 }, (_, i) =>
      r(`2026-04-${String(i + 2).padStart(2, "0")}`, 70),
    );
    const journal = [
      j("2026-04-01", ["alcohol"]),
      j("2026-04-02", ["alcohol"]),
      j("2026-04-03", []),
      j("2026-04-04", []),
      j("2026-04-05", []),
    ];
    expect(behaviorImpacts({ recovery, journal })).toEqual([]);
  });

  it("computes a negative delta for behaviors that lower next-day recovery", () => {
    // 4 days with alcohol → next-day recovery 40
    // 4 days without alcohol → next-day recovery 80
    const recovery: { date: string; score: number }[] = [];
    const journal: { date: string; behaviors: string[] }[] = [];

    for (let i = 0; i < 4; i++) {
      const day = `2026-04-${String(i + 1).padStart(2, "0")}`;
      const next = `2026-04-${String(i + 2).padStart(2, "0")}`;
      journal.push(j(day, ["alcohol"]));
      recovery.push(r(next, 40));
    }
    for (let i = 0; i < 4; i++) {
      const day = `2026-04-${String(i + 10).padStart(2, "0")}`;
      const next = `2026-04-${String(i + 11).padStart(2, "0")}`;
      journal.push(j(day, ["meditation"]));
      recovery.push(r(next, 80));
    }

    const out = behaviorImpacts({ recovery, journal });
    const alcohol = out.find((r) => r.behaviorId === "alcohol");
    const meditation = out.find((r) => r.behaviorId === "meditation");
    expect(alcohol?.delta).toBeLessThan(0);
    expect(meditation?.delta).toBeGreaterThan(0);
  });

  it("sorts by absolute delta descending", () => {
    const recovery: { date: string; score: number }[] = [];
    const journal: { date: string; behaviors: string[] }[] = [];

    // big alcohol effect
    for (let i = 0; i < 4; i++) {
      const day = `2026-04-${String(i + 1).padStart(2, "0")}`;
      const next = `2026-04-${String(i + 2).padStart(2, "0")}`;
      journal.push(j(day, ["alcohol", "caffeine"]));
      recovery.push(r(next, 30));
    }
    // small caffeine-only difference
    for (let i = 0; i < 4; i++) {
      const day = `2026-04-${String(i + 10).padStart(2, "0")}`;
      const next = `2026-04-${String(i + 11).padStart(2, "0")}`;
      journal.push(j(day, ["caffeine"]));
      recovery.push(r(next, 65));
    }
    for (let i = 0; i < 4; i++) {
      const day = `2026-04-${String(i + 20).padStart(2, "0")}`;
      const next = `2026-04-${String(i + 21).padStart(2, "0")}`;
      journal.push(j(day, []));
      recovery.push(r(next, 70));
    }

    const out = behaviorImpacts({ recovery, journal });
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(Math.abs(out[0].delta)).toBeGreaterThanOrEqual(Math.abs(out[1].delta));
  });

  it("scales confidence with sample size", () => {
    const recovery: { date: string; score: number }[] = [];
    const journal: { date: string; behaviors: string[] }[] = [];

    // Build 16 alcohol + 16 non-alcohol → high confidence
    for (let i = 0; i < 16; i++) {
      const day = new Date(2026, 0, 1 + i).toISOString().slice(0, 10);
      const next = new Date(2026, 0, 2 + i).toISOString().slice(0, 10);
      journal.push(j(day, ["alcohol"]));
      recovery.push(r(next, 50));
    }
    for (let i = 0; i < 16; i++) {
      const day = new Date(2026, 1, 1 + i).toISOString().slice(0, 10);
      const next = new Date(2026, 1, 2 + i).toISOString().slice(0, 10);
      journal.push(j(day, []));
      recovery.push(r(next, 75));
    }

    const out = behaviorImpacts({ recovery, journal });
    expect(out[0].confidence).toBe("high");
  });
});
