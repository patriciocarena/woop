import { describe, expect, it } from "vitest";
import { computeStress, computeStressFromStats, STRESS_MIN_SAMPLES } from "@/lib/scoring/stress";
import { parseAppleHealth } from "@/lib/imports/apple-health";

describe("computeStress", () => {
  it("returns null when fewer than STRESS_MIN_SAMPLES readings", () => {
    expect(computeStress([70, 72, 68])).toBeNull();
  });

  it("scores 1 (Low) when HR is flat — CV < 10%", () => {
    // All readings ~70bpm: stddev≈0, CV≈0 → Low
    const readings = [68, 70, 71, 69, 70, 70, 72, 69];
    const result = computeStress(readings);
    expect(result?.score).toBe(1);
  });

  it("scores 2 (Moderate) when CV is 10–20%", () => {
    // Mean ~100, stddev ~13 → CV ~13%
    const readings = [80, 85, 90, 100, 110, 115, 120, 85, 90, 95];
    const result = computeStress(readings);
    expect(result?.score).toBe(2);
  });

  it("scores 3 (High) when CV exceeds 20%", () => {
    // Wide range: resting 55 mixed with peak 170 → very high CV
    const readings = [55, 60, 58, 170, 165, 172, 57, 168, 62, 166];
    const result = computeStress(readings);
    expect(result?.score).toBe(3);
  });

  it("returns sampleCount matching input length", () => {
    const readings = [70, 72, 68, 71, 69, 73];
    const result = computeStress(readings);
    expect(result?.sampleCount).toBe(6);
  });
});

describe("computeStressFromStats", () => {
  it("produces the same score as computeStress for equivalent data", () => {
    const readings = [80, 85, 90, 100, 110, 115, 120, 85, 90, 95];
    const direct = computeStress(readings)!;
    const sum = readings.reduce((a, b) => a + b, 0);
    const sumSq = readings.reduce((a, b) => a + b * b, 0);
    const fromStats = computeStressFromStats({ count: readings.length, sum, sumSq })!;
    expect(fromStats.score).toBe(direct.score);
    expect(fromStats.cv).toBeCloseTo(direct.cv, 0);
  });

  it("returns null when count is below minimum", () => {
    expect(computeStressFromStats({ count: 3, sum: 210, sumSq: 14750 })).toBeNull();
  });
});

describe("parseAppleHealth — stress score extraction", () => {
  function buildHrXml(values: number[], date = "2026-04-20"): string {
    const records = values
      .map(
        (v, i) =>
          `<Record type="HKQuantityTypeIdentifierHeartRate" startDate="${date} ${String(i).padStart(2, "0")}:00:00 -0500" endDate="${date} ${String(i).padStart(2, "0")}:00:01 -0500" value="${v}" unit="count/min"/>`,
      )
      .join("\n");
    return `<HealthData>\n${records}\n</HealthData>`;
  }

  it("emits a stressScore reading for a day with enough HR samples", () => {
    // 10 samples all ~70 → Low stress
    const xml = buildHrXml([68, 70, 71, 69, 70, 70, 72, 69, 71, 68]);
    const r = parseAppleHealth(xml);
    expect(r.vitals.stressScore).toHaveLength(1);
    expect(r.vitals.stressScore[0].date).toBe("2026-04-20");
    expect(r.vitals.stressScore[0].value).toBe(1);
  });

  it("does not emit stressScore for a day with fewer than STRESS_MIN_SAMPLES readings", () => {
    const xml = buildHrXml([70, 72, 68]);
    const r = parseAppleHealth(xml);
    expect(r.vitals.stressScore).toHaveLength(0);
  });

  it("emits High stress for wide HR range across the day", () => {
    const xml = buildHrXml([55, 60, 58, 170, 165, 172, 57, 168, 62, 166]);
    const r = parseAppleHealth(xml);
    expect(r.vitals.stressScore[0].value).toBe(3);
  });

  it(`requires at least ${STRESS_MIN_SAMPLES} samples threshold`, () => {
    expect(STRESS_MIN_SAMPLES).toBe(5);
  });
});
