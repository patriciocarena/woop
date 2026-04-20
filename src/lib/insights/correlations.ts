/**
 * Behavior → recovery correlations.
 *
 * The hypothesis Whoop tests: "behaviors logged on day N affect recovery on
 * morning of day N+1." So we line up each journaled day with the *next*
 * morning's recovery score and split: average recovery on mornings preceded
 * by behavior X vs mornings without. The delta is the impact estimate.
 *
 * Caveats — these are observational, not causal. With small N they're noisy;
 * we surface a `confidence` ("low" | "medium" | "high") based on sample size
 * so the UI can downgrade weak findings instead of pretending they're solid.
 */

import { mean, stdev } from "./stats";

export type RecoveryPoint = { date: string; score: number };
export type JournalPoint = { date: string; behaviors: string[] };

export type ImpactRow = {
  behaviorId: string;
  withAvg: number;
  withoutAvg: number;
  /** withAvg - withoutAvg (positive means behavior is associated with higher recovery). */
  delta: number;
  nWith: number;
  nWithout: number;
  confidence: "low" | "medium" | "high";
};

const MIN_SAMPLES_PER_BUCKET = 3;

export function behaviorImpacts({
  recovery,
  journal,
}: {
  recovery: RecoveryPoint[];
  journal: JournalPoint[];
}): ImpactRow[] {
  // Index recovery by date for O(1) next-day lookup.
  const recoveryByDate = new Map(recovery.map((r) => [r.date, r.score]));

  // Pair each journal day with the recovery score from the *next* morning.
  type Pair = { score: number; behaviors: Set<string> };
  const pairs: Pair[] = [];
  for (const j of journal) {
    const nextDay = nextDate(j.date);
    const nextScore = recoveryByDate.get(nextDay);
    if (nextScore === undefined) continue;
    pairs.push({ score: nextScore, behaviors: new Set(j.behaviors) });
  }

  // Build the universe of behaviors that appeared at least once.
  const allBehaviors = new Set<string>();
  for (const p of pairs) for (const b of p.behaviors) allBehaviors.add(b);

  const rows: ImpactRow[] = [];
  for (const behaviorId of allBehaviors) {
    const withScores: number[] = [];
    const withoutScores: number[] = [];
    for (const p of pairs) {
      if (p.behaviors.has(behaviorId)) withScores.push(p.score);
      else withoutScores.push(p.score);
    }
    if (withScores.length < MIN_SAMPLES_PER_BUCKET) continue;
    if (withoutScores.length < MIN_SAMPLES_PER_BUCKET) continue;

    const withAvg = mean(withScores);
    const withoutAvg = mean(withoutScores);
    rows.push({
      behaviorId,
      withAvg,
      withoutAvg,
      delta: withAvg - withoutAvg,
      nWith: withScores.length,
      nWithout: withoutScores.length,
      confidence: confidenceFor(withScores.length, withoutScores.length),
    });
  }

  // Largest absolute deltas first.
  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return rows;
}

/**
 * Heuristic: more samples per bucket → more confidence. We're not running a
 * proper t-test because users will almost never have enough N for that to be
 * meaningful. The bands here are deliberately conservative.
 */
function confidenceFor(nWith: number, nWithout: number): "low" | "medium" | "high" {
  const min = Math.min(nWith, nWithout);
  if (min >= 14) return "high";
  if (min >= 7) return "medium";
  return "low";
}

function nextDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Re-export so consumers can compute their own SDs without pulling stats directly.
export { mean, stdev };
