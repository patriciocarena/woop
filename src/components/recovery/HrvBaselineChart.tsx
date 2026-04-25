"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HrvBaselinePoint } from "@/lib/insights/recovery-deltas";

type Props = {
  /** Date-aligned HRV points with rolling baseline + ±1σ. */
  data: HrvBaselinePoint[];
  /** Display window label (e.g. "30d"). */
  windowLabel?: string;
};

/**
 * Renders HRV last N days as a line on top of a shaded ±1σ band around the
 * rolling baseline mean. Mirrors the Whoop "your HRV vs your normal" view —
 * out-of-band readings stand out visually.
 */
export function HrvBaselineChart({ data, windowLabel = "30d" }: Props) {
  const hasBand = data.length >= 2 && data.some((d) => d.upper > d.lower);

  return (
    <Card>
      <CardHeader>
        <CardTitle>HRV vs baseline · last {windowLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-fg-muted text-center py-6">
            No HRV readings yet. Log a few mornings to see your trend.
          </p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) =>
                    new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                  }
                  tick={{ fill: "var(--color-fg-dim)", fontSize: 10 }}
                  stroke="rgba(255,255,255,0.1)"
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fill: "var(--color-fg-dim)", fontSize: 10 }}
                  stroke="rgba(255,255,255,0.1)"
                  unit=" ms"
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(d) =>
                    new Date(`${d}T00:00:00`).toLocaleDateString(undefined, {
                      weekday: "short", month: "short", day: "numeric",
                    })
                  }
                  formatter={(v, name) => {
                    const n = Number(v);
                    const labelMap: Record<string, string> = {
                      hrv: "HRV",
                      baseline: "Baseline (28d mean)",
                      upper: "+1σ",
                      lower: "−1σ",
                    };
                    return [Number.isFinite(n) ? `${n.toFixed(1)} ms` : "—", labelMap[String(name)] ?? String(name)];
                  }}
                />
                {/* ±1σ band: Recharts renders [lower, upper] tuple as a shaded range */}
                {hasBand && (
                  <Area
                    type="monotone"
                    dataKey="bandRange"
                    stroke="transparent"
                    fill="var(--color-recovery-high)"
                    fillOpacity={0.10}
                    isAnimationActive={false}
                    activeDot={false}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke="var(--color-fg-muted)"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="hrv"
                  stroke="var(--color-recovery-high)"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: "var(--color-recovery-high)" }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
