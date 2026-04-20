"use client";

import { useMemo } from "react";
import {
  BEHAVIORS,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  behaviorsByCategory,
  type Behavior,
} from "@/lib/journal/behaviors";
import {
  useJournalStore,
  selectEntryByDate,
  type BehaviorCheck,
} from "@/lib/store/journal";
import { cn } from "@/lib/utils";

const POLARITY_BORDER: Record<Behavior["polarity"], string> = {
  positive: "border-recovery-high/60",
  negative: "border-recovery-low/60",
  neutral: "border-border",
};

const POLARITY_BG_ON: Record<Behavior["polarity"], string> = {
  positive: "bg-recovery-high/15 border-recovery-high text-fg",
  negative: "bg-recovery-low/15 border-recovery-low text-fg",
  neutral: "bg-surface-2 border-fg-muted text-fg",
};

export function BehaviorChecklist({ date }: { date: string }) {
  const entry = useJournalStore(selectEntryByDate(date));
  const toggleBehavior = useJournalStore((s) => s.toggleBehavior);
  const setBehaviorAmount = useJournalStore((s) => s.setBehaviorAmount);

  const checked = useMemo(() => {
    const map = new Map<string, BehaviorCheck>();
    entry?.behaviors.forEach((b) => map.set(b.behaviorId, b));
    return map;
  }, [entry]);

  const grouped = useMemo(() => behaviorsByCategory(), []);

  return (
    <div className="space-y-6">
      {CATEGORY_ORDER.map((cat) => (
        <div key={cat} className="space-y-2">
          <h3 className="text-[11px] uppercase tracking-[0.18em] text-fg-muted">
            {CATEGORY_LABEL[cat]}
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {grouped[cat].map((b) => {
              const isOn = checked.has(b.id);
              const log = checked.get(b.id);
              return (
                <div key={b.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleBehavior(date, b.id, b.defaultAmount)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-2 text-left transition-colors",
                      isOn
                        ? POLARITY_BG_ON[b.polarity]
                        : `${POLARITY_BORDER[b.polarity]} bg-surface-1 text-fg-muted hover:bg-surface-2`,
                    )}
                    aria-pressed={isOn}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">{b.emoji}</span>
                      <span className="text-sm font-medium">{b.label}</span>
                    </div>
                    {b.hint && (
                      <p className="text-[10px] text-fg-dim mt-1 leading-tight">{b.hint}</p>
                    )}
                  </button>

                  {isOn && b.unit && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step={b.unit === "min" ? 5 : 1}
                        value={log?.amount ?? b.defaultAmount ?? 0}
                        onChange={(e) =>
                          setBehaviorAmount(date, b.id, Number(e.target.value))
                        }
                        className="h-7 w-16 rounded-md border border-border bg-surface-2 px-2 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-white/30"
                        aria-label={`${b.label} amount`}
                      />
                      <span className="text-[10px] uppercase tracking-widest text-fg-dim">
                        {b.unit}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <p className="text-[11px] text-fg-dim">
        {BEHAVIORS.length} behaviors · positive (green), negative (red),
        neutral (grey). Insights phase will measure how each one affects your
        recovery.
      </p>
    </div>
  );
}
