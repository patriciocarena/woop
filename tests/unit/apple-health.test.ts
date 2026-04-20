import { describe, expect, it } from "vitest";
import { parseAppleHealth } from "@/lib/imports/apple-health";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2024-01-15 23:30:00 -0500" endDate="2024-01-16 03:00:00 -0500" value="HKCategoryValueSleepAnalysisAsleepCore"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2024-01-16 03:00:00 -0500" endDate="2024-01-16 05:00:00 -0500" value="HKCategoryValueSleepAnalysisAsleepDeep"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2024-01-16 05:00:00 -0500" endDate="2024-01-16 05:10:00 -0500" value="HKCategoryValueSleepAnalysisAwake"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2024-01-16 05:10:00 -0500" endDate="2024-01-16 07:00:00 -0500" value="HKCategoryValueSleepAnalysisAsleepREM"/>
  <Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN" startDate="2024-01-16 07:30:00 -0500" endDate="2024-01-16 07:30:01 -0500" value="48.5" unit="ms"/>
  <Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN" startDate="2024-01-16 08:00:00 -0500" endDate="2024-01-16 08:00:01 -0500" value="51.5" unit="ms"/>
  <Record type="HKQuantityTypeIdentifierRestingHeartRate" startDate="2024-01-16 08:05:00 -0500" endDate="2024-01-16 08:05:01 -0500" value="58" unit="count/min"/>
  <Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="35" durationUnit="min" startDate="2024-01-16 17:00:00 -0500" endDate="2024-01-16 17:35:00 -0500"/>
</HealthData>`;

describe("parseAppleHealth", () => {
  it("aggregates sleep segments into one session per wake date", () => {
    const r = parseAppleHealth(XML);
    expect(r.sleep).toHaveLength(1);
    const s = r.sleep[0];
    expect(s.date).toBe("2024-01-16");
    // 3.5h core + 2h deep + 1h50 REM = 7h20 = 440 min
    expect(s.asleepMin).toBe(440);
    expect(s.disturbances).toBe(1);
  });

  it("averages HRV and RHR into a daily recovery entry", () => {
    const r = parseAppleHealth(XML);
    expect(r.recovery).toHaveLength(1);
    expect(r.recovery[0]).toMatchObject({ date: "2024-01-16", hrv: 50, rhr: 58 });
  });

  it("extracts workouts with mapped sport + rounded duration", () => {
    const r = parseAppleHealth(XML);
    expect(r.workouts).toHaveLength(1);
    expect(r.workouts[0]).toMatchObject({
      date: "2024-01-16",
      sport: "run",
      durationMin: 35,
    });
  });

  it("skips HRV-only days (no RHR pair)", () => {
    const xml = `<HealthData>
      <Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN" startDate="2024-02-01 08:00:00 +0000" endDate="2024-02-01 08:00:01 +0000" value="42"/>
    </HealthData>`;
    expect(parseAppleHealth(xml).recovery).toHaveLength(0);
  });
});
