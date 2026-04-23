import { describe, expect, it } from "vitest";
import { parseAppleHealth } from "@/lib/imports/apple-health";

describe("parseAppleHealth — Phase 13 vitals", () => {
  it("normalizes SpO2 stored as fraction (0–1) into percent", () => {
    const xml = `<HealthData>
      <Record type="HKQuantityTypeIdentifierOxygenSaturation" startDate="2026-04-15 03:12:00 -0500" endDate="2026-04-15 03:12:01 -0500" value="0.97" unit="%"/>
      <Record type="HKQuantityTypeIdentifierOxygenSaturation" startDate="2026-04-15 04:12:00 -0500" endDate="2026-04-15 04:12:01 -0500" value="0.95" unit="%"/>
    </HealthData>`;
    const r = parseAppleHealth(xml);
    expect(r.vitals.spo2).toHaveLength(1);
    expect(r.vitals.spo2[0]).toEqual({ date: "2026-04-15", value: 96 });
  });

  it("accepts SpO2 stored already in percent and averages multiple samples", () => {
    const xml = `<HealthData>
      <Record type="HKQuantityTypeIdentifierOxygenSaturation" startDate="2026-04-16 02:00:00 -0500" endDate="2026-04-16 02:00:01 -0500" value="98"/>
      <Record type="HKQuantityTypeIdentifierOxygenSaturation" startDate="2026-04-16 03:00:00 -0500" endDate="2026-04-16 03:00:01 -0500" value="96"/>
    </HealthData>`;
    const r = parseAppleHealth(xml);
    expect(r.vitals.spo2[0]).toEqual({ date: "2026-04-16", value: 97 });
  });

  it("rejects implausible SpO2 (<70% or >100%) without crashing", () => {
    const xml = `<HealthData>
      <Record type="HKQuantityTypeIdentifierOxygenSaturation" startDate="2026-04-15 03:00:00 -0500" endDate="2026-04-15 03:00:01 -0500" value="50"/>
      <Record type="HKQuantityTypeIdentifierOxygenSaturation" startDate="2026-04-15 03:01:00 -0500" endDate="2026-04-15 03:01:01 -0500" value="120"/>
    </HealthData>`;
    const r = parseAppleHealth(xml);
    expect(r.vitals.spo2).toHaveLength(0);
    expect(r.skipped.vitalReadings).toBe(2);
  });

  it("captures sleeping wrist temperature deltas (negative is normal)", () => {
    const xml = `<HealthData>
      <Record type="HKQuantityTypeIdentifierAppleSleepingWristTemperature" startDate="2026-04-15 03:00:00 -0500" endDate="2026-04-15 03:00:01 -0500" value="-0.4" unit="degC"/>
      <Record type="HKQuantityTypeIdentifierAppleSleepingWristTemperature" startDate="2026-04-15 04:00:00 -0500" endDate="2026-04-15 04:00:01 -0500" value="-0.2" unit="degC"/>
    </HealthData>`;
    const r = parseAppleHealth(xml);
    expect(r.vitals.wristTemp).toHaveLength(1);
    expect(r.vitals.wristTemp[0].date).toBe("2026-04-15");
    expect(r.vitals.wristTemp[0].value).toBeCloseTo(-0.3, 5);
  });

  it("captures walking HR averages and aggregates to daily mean", () => {
    const xml = `<HealthData>
      <Record type="HKQuantityTypeIdentifierWalkingHeartRateAverage" startDate="2026-04-15 10:00:00 -0500" endDate="2026-04-15 10:00:01 -0500" value="86" unit="count/min"/>
      <Record type="HKQuantityTypeIdentifierWalkingHeartRateAverage" startDate="2026-04-15 14:00:00 -0500" endDate="2026-04-15 14:00:01 -0500" value="92" unit="count/min"/>
    </HealthData>`;
    const r = parseAppleHealth(xml);
    expect(r.vitals.walkingHr).toEqual([{ date: "2026-04-15", value: 89 }]);
  });

  it("returns empty arrays + zero skipped when no vital records present", () => {
    const xml = `<HealthData>
      <Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN" startDate="2026-04-15 08:00:00 -0500" endDate="2026-04-15 08:00:01 -0500" value="50"/>
      <Record type="HKQuantityTypeIdentifierRestingHeartRate" startDate="2026-04-15 08:05:00 -0500" endDate="2026-04-15 08:05:01 -0500" value="58"/>
    </HealthData>`;
    const r = parseAppleHealth(xml);
    expect(r.vitals.spo2).toEqual([]);
    expect(r.vitals.wristTemp).toEqual([]);
    expect(r.vitals.walkingHr).toEqual([]);
    expect(r.skipped.vitalReadings).toBe(0);
  });
});
