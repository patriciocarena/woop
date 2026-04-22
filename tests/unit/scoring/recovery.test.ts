import { describe, expect, it } from "vitest";
import {
  computeBaseline,
  computeRecovery,
  zoneFor,
  MIN_BASELINE_SAMPLES,
  RECOVERY_WEIGHTS,
} from "@/lib/scoring/recovery";

describe("RECOVERY_WEIGHTS", () => {
  it("sums exactly to 1.0 — silent re-tuning regression guard", () => {
    const sum =
      RECOVERY_WEIGHTS.hrv +
      RECOVERY_WEIGHTS.rhr +
      RECOVERY_WEIGHTS.sleep +
      RECOVERY_WEIGHTS.respiratory;
    expect(sum).toBeCloseTo(1.0, 6);
  });

  it("HRV stays the dominant weight", () => {
    const others = [
      RECOVERY_WEIGHTS.rhr,
      RECOVERY_WEIGHTS.sleep,
      RECOVERY_WEIGHTS.respiratory,
    ];
    for (const w of others) expect(RECOVERY_WEIGHTS.hrv).toBeGreaterThan(w);
  });
});

describe("computeBaseline", () => {
  it("returns zeros for an empty input", () => {
    expect(computeBaseline([])).toEqual({ mean: 0, std: 1, n: 0 });
  });

  it("computes mean and population std", () => {
    const b = computeBaseline([60, 62, 64, 66]);
    expect(b.mean).toBe(63);
    expect(b.n).toBe(4);
    // population std of [60,62,64,66] ≈ 2.236
    expect(b.std).toBeCloseTo(2.236, 2);
  });

  it("floors std so a single-sample baseline does not explode z-scores", () => {
    const b = computeBaseline([60]);
    expect(b.std).toBeGreaterThan(0); // not 0
    expect(b.n).toBe(1);
  });

  it("uses only the most recent window of samples", () => {
    const xs = Array.from({ length: 50 }, (_, i) => i + 1); // 1..50
    const b = computeBaseline(xs, 10); // last 10: 41..50
    expect(b.mean).toBe(45.5);
    expect(b.n).toBe(10);
  });
});

describe("zoneFor", () => {
  it("matches Whoop's red/yellow/green thresholds", () => {
    expect(zoneFor(20)).toBe("low");
    expect(zoneFor(33.9)).toBe("low");
    expect(zoneFor(34)).toBe("mid");
    expect(zoneFor(66.9)).toBe("mid");
    expect(zoneFor(67)).toBe("high");
    expect(zoneFor(100)).toBe("high");
  });
});

describe("computeRecovery", () => {
  const stableHistory = Array.from({ length: 28 }, () => 60);
  const baselines = {
    hrv: computeBaseline(stableHistory),    // mean 60, std floored
    rhr: computeBaseline(stableHistory),    // mean 60
    respiratory: computeBaseline(Array.from({ length: 28 }, () => 14)),
  };

  it("returns calibrating when baselines have too few samples", () => {
    const r = computeRecovery({
      hrv: 60,
      rhr: 60,
      baselines: {
        hrv: computeBaseline([60]),
        rhr: computeBaseline([60]),
      },
    });
    expect(r.zone).toBe("calibrating");
  });

  it("calibrating threshold matches MIN_BASELINE_SAMPLES", () => {
    const tooFew = Array.from({ length: MIN_BASELINE_SAMPLES - 1 }, () => 60);
    const enough = Array.from({ length: MIN_BASELINE_SAMPLES }, () => 60);
    expect(
      computeRecovery({
        hrv: 60,
        rhr: 60,
        baselines: { hrv: computeBaseline(tooFew), rhr: computeBaseline(tooFew) },
      }).zone,
    ).toBe("calibrating");
    expect(
      computeRecovery({
        hrv: 60,
        rhr: 60,
        baselines: { hrv: computeBaseline(enough), rhr: computeBaseline(enough) },
      }).zone,
    ).not.toBe("calibrating");
  });

  it("hits ~50 score when everything is at baseline (no sleep input)", () => {
    const r = computeRecovery({ hrv: 60, rhr: 60, baselines });
    // hrv 50, rhr 50, sleep 60 (default), resp 70 (default neutral)
    // 0.5*50 + 0.25*50 + 0.15*60 + 0.1*70 = 25+12.5+9+7 = 53.5
    expect(r.score).toBeCloseTo(53.5, 1);
    expect(r.zone).toBe("mid");
  });

  it("higher HRV than baseline raises the score and pushes toward green", () => {
    const high = Array.from({ length: 28 }, () => 60);
    const r = computeRecovery({
      hrv: 90,            // way above mean 60
      rhr: 50,            // below mean 60 (good)
      sleepPerformance: 90,
      baselines: { hrv: computeBaseline(high), rhr: computeBaseline(high) },
    });
    expect(r.score).toBeGreaterThan(80);
    expect(r.zone).toBe("high");
  });

  it("lower HRV + higher RHR + bad sleep tanks the score into red", () => {
    const r = computeRecovery({
      hrv: 30,             // way below
      rhr: 90,             // way above
      sleepPerformance: 30,
      baselines,
    });
    expect(r.score).toBeLessThan(34);
    expect(r.zone).toBe("low");
  });

  it("respiratory rate deviation only nudges, never dominates", () => {
    const baseR = computeRecovery({ hrv: 60, rhr: 60, baselines });
    const withResp = computeRecovery({
      hrv: 60,
      rhr: 60,
      respiratoryRate: 22, // far above baseline 14
      baselines,
    });
    // Respiratory weight is 0.1 → max swing is 10 points absolute.
    expect(Math.abs(withResp.score - baseR.score)).toBeLessThan(11);
    expect(withResp.score).toBeLessThan(baseR.score);
  });
});
