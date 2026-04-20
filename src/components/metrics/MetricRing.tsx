"use client";

import { motion } from "framer-motion";
import { cn, clamp } from "@/lib/utils";

type MetricRingProps = {
  /** Value 0..max (defaults max to 100) */
  value: number;
  max?: number;
  /** Hex color or CSS color for the arc */
  color: string;
  /** Pixel size of the SVG */
  size?: number;
  /** Stroke width of the arc */
  thickness?: number;
  /** Big number to render in the center (overrides percentage) */
  centerLabel?: string;
  /** Subtitle text under the big number */
  caption?: string;
  className?: string;
};

export function MetricRing({
  value,
  max = 100,
  color,
  size = 220,
  thickness = 14,
  centerLabel,
  caption,
  className,
}: MetricRingProps) {
  const pct = clamp(value / max, 0, 1);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * pct;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--color-surface-3)"
          strokeWidth={thickness}
          fill="none"
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - dash }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-stat text-5xl text-fg">
          {centerLabel ?? Math.round(pct * 100)}
        </span>
        {caption && (
          <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-fg-muted">
            {caption}
          </span>
        )}
      </div>
    </div>
  );
}
