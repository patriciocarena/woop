"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyPoint } from "@/lib/insights/trends";

export type TrendChartProps = {
  title: string;
  data: DailyPoint[];
  color: string;
  yMin?: number;
  yMax?: number;
  unit?: string;
  /** Reference line, e.g. recovery 67 = "green" threshold. */
  referenceLines?: { y: number; label?: string; color?: string }[];
  /** Show 7-day moving average dashed line. */
  showMovingAverage?: boolean;
};

export function TrendChart({
  title, data, color, yMin = 0, yMax = 100, unit = "",
  referenceLines = [], showMovingAverage = true,
}: TrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
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
                domain={[yMin, yMax]}
                tick={{ fill: "var(--color-fg-dim)", fontSize: 10 }}
                stroke="rgba(255,255,255,0.1)"
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface-1)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(d) =>
                  new Date(`${d}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: "short", month: "short", day: "numeric",
                  })
                }
                formatter={(v) => {
                  const n = Number(v);
                  return [Number.isFinite(n) ? `${n.toFixed(1)}${unit}` : "—", ""];
                }}
              />
              {referenceLines.map((rl, i) => (
                <ReferenceLine
                  key={i}
                  y={rl.y}
                  stroke={rl.color ?? "rgba(255,255,255,0.2)"}
                  strokeDasharray="4 4"
                  label={rl.label ? { value: rl.label, position: "right", fill: rl.color, fontSize: 10 } : undefined}
                />
              ))}
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={{ r: 2, fill: color }}
                isAnimationActive={false}
              />
              {showMovingAverage && (
                <Line
                  type="monotone"
                  dataKey="ma7"
                  stroke={color}
                  strokeOpacity={0.4}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
