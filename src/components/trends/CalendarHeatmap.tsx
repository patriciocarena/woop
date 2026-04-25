"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type HeatmapPoint = { date: string; score: number | null };

type Props = {
  /** Map of YYYY-MM-DD → score 0..100 (or null/undefined for missing days). */
  byDate: Map<string, number>;
  /** Window size in days (default 90 = ~13 weeks). */
  days?: number;
  /** Optional title override. */
  title?: string;
};

/**
 * Whoop-style calendar heatmap. 13 columns × 7 rows by default — each cell is
 * one day, columns are weeks (left = oldest), rows = Mon..Sun. Empty days are
 * dark surface; logged days are tinted by recovery zone (red/yellow/green).
 *
 * Pure presentational — caller provides a map of date→score.
 */
export function CalendarHeatmap({ byDate, days = 90, title }: Props) {
  const cells = buildCells(byDate, days);
  // Bucket by week (Monday key) to render as columns.
  const weeks = bucketByWeek(cells);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title ?? `Recovery · last ${days} days`}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-2">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((cell, di) => (
                <Cell key={`${wi}-${di}`} cell={cell} />
              ))}
            </div>
          ))}
        </div>
        <Legend />
      </CardContent>
    </Card>
  );
}

function Cell({ cell }: { cell: HeatmapPoint }) {
  const tone = toneFor(cell.score);
  return (
    <div
      className={cn(
        "size-3.5 rounded-[3px] border border-border/40",
        tone,
      )}
      title={
        cell.score !== null
          ? `${cell.date} · Recovery ${Math.round(cell.score)}%`
          : `${cell.date} · No data`
      }
    />
  );
}

function Legend() {
  return (
    <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-fg-muted">
      <span>Less</span>
      <span className="size-3 rounded-[3px] bg-surface-3 border border-border/40" />
      <span className="size-3 rounded-[3px] bg-recovery-low/60 border border-border/40" />
      <span className="size-3 rounded-[3px] bg-recovery-mid/70 border border-border/40" />
      <span className="size-3 rounded-[3px] bg-recovery-high/80 border border-border/40" />
      <span className="size-3 rounded-[3px] bg-recovery-high border border-border/40" />
      <span>More</span>
    </div>
  );
}

function toneFor(score: number | null): string {
  if (score === null) return "bg-surface-3";
  // Whoop bands: <34 red, 34..66 yellow, ≥67 green. Add intensity within green.
  if (score < 34) return "bg-recovery-low/60";
  if (score < 67) return "bg-recovery-mid/70";
  if (score < 85) return "bg-recovery-high/80";
  return "bg-recovery-high";
}

/**
 * Build N cells ending today, oldest first. Pads the leading days of the
 * first week so every column has 7 rows aligned Mon..Sun.
 */
function buildCells(byDate: Map<string, number>, days: number): HeatmapPoint[] {
  const out: HeatmapPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const v = byDate.get(date);
    out.push({ date, score: typeof v === "number" ? v : null });
  }
  return out;
}

/**
 * Group cells into Mon..Sun columns. The first column may be partial (padded
 * at the top with empty placeholders) so the day rows line up across weeks.
 */
function bucketByWeek(cells: HeatmapPoint[]): HeatmapPoint[][] {
  if (cells.length === 0) return [];
  const weeks: HeatmapPoint[][] = [];
  // Determine the day-of-week (0 = Monday) for the first cell so we can pad.
  const first = new Date(`${cells[0].date}T00:00:00`);
  const firstDow = (first.getDay() + 6) % 7; // 0 = Monday

  let current: HeatmapPoint[] = [];
  // Padding placeholders so the first column starts at the correct row.
  for (let p = 0; p < firstDow; p++) {
    current.push({ date: "", score: null });
  }

  for (const cell of cells) {
    current.push(cell);
    if (current.length === 7) {
      weeks.push(current);
      current = [];
    }
  }
  if (current.length > 0) {
    while (current.length < 7) current.push({ date: "", score: null });
    weeks.push(current);
  }
  return weeks;
}
