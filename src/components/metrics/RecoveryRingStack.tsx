"use client";

import { motion } from "framer-motion";
import { cn, clamp } from "@/lib/utils";

type RecoveryRingStackProps = {
  /** Recovery score 0..100. */
  value: number;
  /** HRV delta vs baseline as a percentage (e.g. +12 = HRV 12% above baseline). */
  hrvDeltaPct?: number | null;
  /** RHR delta vs baseline as a percentage (lower is better). */
  rhrDeltaPct?: number | null;
  /** Caption under the center number. */
  caption?: string;
  size?: number;
  className?: string;
};

/**
 * Whoop-style ring stack: 3 concentric arcs.
 *
 *   • Outer (largest) — recovery score 0..100, color by zone.
 *   • Middle           — HRV delta vs baseline, centered at 12 o'clock,
 *                        sweeps clockwise (positive) or counter-clockwise (negative).
 *                        Saturates at ±20%.
 *   • Inner (smallest) — RHR delta vs baseline, same convention but inverted
 *                        (lower RHR is good → green, higher is bad → red).
 *
 * Sub-rings render as a thin track with a colored arc on top, anchored at the
 * top of the circle. They communicate "you are X% above/below your normal".
 */
export function RecoveryRingStack({
  value,
  hrvDeltaPct,
  rhrDeltaPct,
  caption = "Recovery",
  size = 220,
  className,
}: RecoveryRingStackProps) {
  const score = clamp(value, 0, 100);
  const color = recoveryColor(score);

  // Geometry — pulled out so all rings share the same center.
  const cx = size / 2;
  const cy = size / 2;
  const mainThickness = 14;
  const subThickness = 5;
  const subGap = 6; // gap between rings

  const mainRadius = (size - mainThickness) / 2;
  const hrvRadius = mainRadius - mainThickness / 2 - subGap - subThickness / 2;
  const rhrRadius = hrvRadius - subThickness - subGap;

  const mainCirc = 2 * Math.PI * mainRadius;
  const hrvCirc = 2 * Math.PI * hrvRadius;
  const rhrCirc = 2 * Math.PI * rhrRadius;

  const mainDash = mainCirc * (score / 100);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Main ring — recovery score */}
        <circle cx={cx} cy={cy} r={mainRadius} stroke="var(--color-surface-3)" strokeWidth={mainThickness} fill="none" />
        <motion.circle
          cx={cx}
          cy={cy}
          r={mainRadius}
          stroke={color}
          strokeWidth={mainThickness}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={mainCirc}
          initial={{ strokeDashoffset: mainCirc }}
          animate={{ strokeDashoffset: mainCirc - mainDash }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* HRV sub-ring */}
        <SubRing
          cx={cx}
          cy={cy}
          r={hrvRadius}
          circumference={hrvCirc}
          thickness={subThickness}
          deltaPct={hrvDeltaPct}
          higherIsBetter
        />

        {/* RHR sub-ring */}
        <SubRing
          cx={cx}
          cy={cy}
          r={rhrRadius}
          circumference={rhrCirc}
          thickness={subThickness}
          deltaPct={rhrDeltaPct}
          higherIsBetter={false}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <motion.span
          key={score}
          className="font-stat text-5xl text-fg"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {Math.round(score)}%
        </motion.span>
        {caption && (
          <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-fg-muted">
            {caption}
          </span>
        )}
        {(hrvDeltaPct !== null && hrvDeltaPct !== undefined) || (rhrDeltaPct !== null && rhrDeltaPct !== undefined) ? (
          <div className="mt-2 flex gap-3 text-[10px] uppercase tracking-widest">
            {hrvDeltaPct !== null && hrvDeltaPct !== undefined && (
              <DeltaPill label="HRV" pct={hrvDeltaPct} higherIsBetter />
            )}
            {rhrDeltaPct !== null && rhrDeltaPct !== undefined && (
              <DeltaPill label="RHR" pct={rhrDeltaPct} higherIsBetter={false} />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SubRing({
  cx, cy, r, circumference, thickness, deltaPct, higherIsBetter,
}: {
  cx: number; cy: number; r: number; circumference: number; thickness: number;
  deltaPct: number | null | undefined;
  higherIsBetter: boolean;
}) {
  if (deltaPct === null || deltaPct === undefined) {
    return (
      <circle cx={cx} cy={cy} r={r} stroke="var(--color-surface-3)" strokeWidth={thickness} fill="none" opacity={0.5} />
    );
  }
  // Saturate at ±20% for ring fill purposes.
  const SATURATION = 20;
  const fill = clamp(Math.abs(deltaPct) / SATURATION, 0, 1);
  // "Good" if delta sign aligns with higherIsBetter direction.
  const isPositive = higherIsBetter ? deltaPct > 0 : deltaPct < 0;
  const arcColor = isPositive
    ? "var(--color-recovery-high)"
    : Math.abs(deltaPct) < 3
      ? "var(--color-fg-muted)"
      : "var(--color-recovery-low)";
  const dash = circumference * fill;

  return (
    <>
      <circle cx={cx} cy={cy} r={r} stroke="var(--color-surface-3)" strokeWidth={thickness} fill="none" />
      <motion.circle
        cx={cx}
        cy={cy}
        r={r}
        stroke={arcColor}
        strokeWidth={thickness}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference - dash }}
        transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      />
    </>
  );
}

function DeltaPill({ label, pct, higherIsBetter }: { label: string; pct: number; higherIsBetter: boolean }) {
  const isGood = higherIsBetter ? pct > 0 : pct < 0;
  const colorClass = Math.abs(pct) < 3
    ? "text-fg-muted"
    : isGood ? "text-recovery-high" : "text-recovery-low";
  const sign = pct > 0 ? "+" : "";
  return (
    <span className={cn("font-mono", colorClass)}>
      {label} {sign}{pct.toFixed(0)}%
    </span>
  );
}

function recoveryColor(value: number) {
  if (value >= 67) return "var(--color-recovery-high)";
  if (value >= 34) return "var(--color-recovery-mid)";
  return "var(--color-recovery-low)";
}
