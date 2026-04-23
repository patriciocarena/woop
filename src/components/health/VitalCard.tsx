"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type VitalReading = {
  date: string;          // YYYY-MM-DD
  value: number;
};

export type VitalCardProps = {
  /** Display title — e.g. "HRV (SDNN)". */
  title: string;
  /** Unit string shown after the value — e.g. "ms", "bpm", "%", "°C". */
  unit: string;
  /** All known readings, ascending by date. Card hides itself if empty. */
  readings: VitalReading[];
  /** Optional value formatter. Default: 1 decimal for non-integer units. */
  format?: (n: number) => string;
  /** Helper text under the title — e.g. "Apple Health · 14 days". */
  hint?: string;
};

const SPARKLINE_W = 240;
const SPARKLINE_H = 56;
const SPARKLINE_PAD = 4;
const WINDOW_DAYS = 30;
const BASELINE_MIN_SAMPLES = 7;

type Status = "normal" | "elevated" | "abnormal" | "calibrating";

function defaultFormat(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(1);
}

function formatSigned(n: number, digits = 2): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}`;
}

function relativeDay(date: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (date === today) return "today";
  const ms = new Date(`${today}T00:00:00`).getTime() - new Date(`${date}T00:00:00`).getTime();
  const days = Math.round(ms / 86_400_000);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function statusBadge(status: Status): { label: string; className: string } {
  switch (status) {
    case "normal":
      return { label: "Normal", className: "border-recovery-high/40 bg-recovery-high/10 text-recovery-high" };
    case "elevated":
      return { label: "Elevated", className: "border-recovery-mid/40 bg-recovery-mid/10 text-recovery-mid" };
    case "abnormal":
      return { label: "Out of range", className: "border-recovery-low/40 bg-recovery-low/10 text-recovery-low" };
    case "calibrating":
      return { label: "Calibrating", className: "border-border bg-surface-2 text-fg-muted" };
  }
}

export function VitalCard({
  title,
  unit,
  readings,
  format = defaultFormat,
  hint,
}: VitalCardProps) {
  const stats = useMemo(() => {
    if (readings.length === 0) return null;
    const window = readings.slice(-WINDOW_DAYS);
    const latest = window[window.length - 1];
    const prior = window.slice(0, -1);
    const enoughForBaseline = prior.length >= BASELINE_MIN_SAMPLES;
    const baseline = enoughForBaseline
      ? prior.reduce((a, r) => a + r.value, 0) / prior.length
      : 0;
    const variance = enoughForBaseline
      ? prior.reduce((a, r) => a + (r.value - baseline) ** 2, 0) / prior.length
      : 0;
    const stddev = Math.sqrt(variance);
    const delta = enoughForBaseline ? latest.value - baseline : 0;
    const z = stddev > 0 ? delta / stddev : 0;
    let status: Status;
    if (!enoughForBaseline) status = "calibrating";
    else if (Math.abs(z) > 2) status = "abnormal";
    else if (Math.abs(z) > 1) status = "elevated";
    else status = "normal";
    return { window, latest, prior, baseline, stddev, delta, z, status, enoughForBaseline };
  }, [readings]);

  const sparklinePath = useMemo(() => {
    if (!stats) return null;
    const xs = stats.window.map((_, i) => i);
    const ys = stats.window.map((r) => r.value);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanY = maxY - minY || 1;
    const spanX = Math.max(1, xs.length - 1);
    const usableW = SPARKLINE_W - SPARKLINE_PAD * 2;
    const usableH = SPARKLINE_H - SPARKLINE_PAD * 2;
    const pts = stats.window.map((r, i) => {
      const x = SPARKLINE_PAD + (i / spanX) * usableW;
      const y = SPARKLINE_PAD + usableH - ((r.value - minY) / spanY) * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const baselineY = stats.enoughForBaseline
      ? SPARKLINE_PAD + usableH - ((stats.baseline - minY) / spanY) * usableH
      : null;
    return {
      polyline: pts.join(" "),
      lastX: SPARKLINE_PAD + usableW,
      lastY:
        SPARKLINE_PAD +
        usableH -
        ((stats.latest.value - minY) / spanY) * usableH,
      baselineY,
    };
  }, [stats]);

  if (!stats || !sparklinePath) return null;

  const badge = statusBadge(stats.status);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          <p className="text-[11px] uppercase tracking-widest text-fg-dim">
            {hint ?? `Last reading · ${relativeDay(stats.latest.date)}`}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${badge.className}`}
        >
          {badge.label}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="font-stat text-4xl">{format(stats.latest.value)}</span>
          <span className="text-sm text-fg-muted">{unit}</span>
        </div>

        <svg
          viewBox={`0 0 ${SPARKLINE_W} ${SPARKLINE_H}`}
          className="w-full h-14"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {sparklinePath.baselineY !== null && (
            <line
              x1={SPARKLINE_PAD}
              x2={SPARKLINE_W - SPARKLINE_PAD}
              y1={sparklinePath.baselineY}
              y2={sparklinePath.baselineY}
              className="stroke-fg-dim"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          )}
          <polyline
            fill="none"
            className="stroke-fg"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={sparklinePath.polyline}
          />
          <circle cx={sparklinePath.lastX} cy={sparklinePath.lastY} r="2.5" className="fill-fg" />
        </svg>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-fg-dim uppercase tracking-widest">Baseline</p>
            <p className="text-fg pt-1">
              {stats.enoughForBaseline
                ? `${format(stats.baseline)} ${unit}`
                : `${stats.prior.length}/${BASELINE_MIN_SAMPLES} days`}
            </p>
          </div>
          <div>
            <p className="text-fg-dim uppercase tracking-widest">Δ vs baseline</p>
            <p className="text-fg pt-1">
              {stats.enoughForBaseline ? (
                <>
                  {formatSigned(stats.delta)} {unit}
                  {stats.stddev > 0 && (
                    <span className="text-fg-dim"> · z {formatSigned(stats.z, 1)}</span>
                  )}
                </>
              ) : (
                <span className="text-fg-muted">—</span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
