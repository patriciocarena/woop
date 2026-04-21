import { describe, expect, it } from "vitest";
import { parseAppleHealth } from "@/lib/imports/apple-health";
import { computeSleepQuality, computeSleepPerformance } from "@/lib/scoring/sleep";

const STAGE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2024-03-01 23:30:00 -0500" endDate="2024-03-02 03:00:00 -0500" value="HKCategoryValueSleepAnalysisAsleepCore"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2024-03-02 03:00:00 -0500" endDate="2024-03-02 04:30:00 -0500" value="HKCategoryValueSleepAnalysisAsleepDeep"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2024-03-02 04:30:00 -0500" endDate="2024-03-02 04:45:00 -0500" value="HKCategoryValueSleepAnalysisAwake"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2024-03-02 04:45:00 -0500" endDate="2024-03-02 06:30:00 -0500" value="HKCategoryValueSleepAnalysisAsleepREM"/>
</HealthData>`;

const LEGACY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Pillow" startDate="2024-03-01 23:00:00 -0500" endDate="2024-03-02 07:00:00 -0500" value="HKCategoryValueSleepAnalysisAsleep"/>
</HealthData>`;

describe("parseAppleHealth — sleep stages", () => {
  it("emits per-stage breakdown when source distinguishes Core/Deep/REM", () => {
    const r = parseAppleHealth(STAGE_XML);
    expect(r.sleep).toHaveLength(1);
    const s = r.sleep[0];
    expect(s.stages).toBeDefined();
    expect(s.stages).toEqual({
      coreMin: 210,  // 23:30 → 03:00 = 3h30
      deepMin: 90,   // 03:00 → 04:30 = 1h30
      remMin: 105,   // 04:45 → 06:30 = 1h45
      awakeMin: 15,  // 04:30 → 04:45
    });
    // asleepMin = core + deep + rem (awake excluded)
    expect(s.asleepMin).toBe(405);
    expect(s.disturbances).toBe(1);
  });

  it("does NOT emit stages for legacy 'Asleep' (unspecified) sessions", () => {
    const r = parseAppleHealth(LEGACY_XML);
    expect(r.sleep).toHaveLength(1);
    expect(r.sleep[0].stages).toBeUndefined();
    expect(r.sleep[0].asleepMin).toBe(8 * 60);
  });
});

describe("computeSleepQuality", () => {
  it("returns 100 when stages info is missing (no penalty)", () => {
    expect(computeSleepQuality(undefined)).toBe(100);
  });

  it("hits 100 when Deep ≥ 90m and REM ≥ 90m", () => {
    expect(
      computeSleepQuality({ coreMin: 240, deepMin: 100, remMin: 110, awakeMin: 5 }),
    ).toBe(100);
  });

  it("scales linearly with shortfall — half deep + half REM ≈ 50", () => {
    const q = computeSleepQuality({ coreMin: 240, deepMin: 45, remMin: 45, awakeMin: 0 });
    expect(q).toBeGreaterThanOrEqual(49);
    expect(q).toBeLessThanOrEqual(51);
  });

  it("zero deep + zero REM → 0", () => {
    expect(computeSleepQuality({ coreMin: 480, deepMin: 0, remMin: 0, awakeMin: 0 })).toBe(0);
  });
});

describe("computeSleepPerformance with stages", () => {
  it("re-weights to include quality when stages present (good night)", () => {
    const withStages = computeSleepPerformance({
      asleepMin: 480,
      needMin: 480,
      timeInBedMin: 510,
      consistency: 0.9,
      stages: { coreMin: 270, deepMin: 100, remMin: 110, awakeMin: 30 },
    });
    const withoutStages = computeSleepPerformance({
      asleepMin: 480,
      needMin: 480,
      timeInBedMin: 510,
      consistency: 0.9,
    });
    // both should be very high; stages version should reward quality (≥ baseline duration)
    expect(withStages.parts.quality).toBe(100);
    expect(withStages.score).toBeGreaterThan(90);
    expect(withoutStages.score).toBeGreaterThan(90);
  });

  it("penalises a long but stage-poor sleep", () => {
    const stagePoor = computeSleepPerformance({
      asleepMin: 480,
      needMin: 480,
      timeInBedMin: 510,
      consistency: 0.9,
      stages: { coreMin: 470, deepMin: 5, remMin: 5, awakeMin: 30 },
    });
    const stageRich = computeSleepPerformance({
      asleepMin: 480,
      needMin: 480,
      timeInBedMin: 510,
      consistency: 0.9,
      stages: { coreMin: 270, deepMin: 100, remMin: 110, awakeMin: 30 },
    });
    expect(stagePoor.score).toBeLessThan(stageRich.score);
  });
});
