/**
 * Behavior catalog.
 *
 * The set of toggle-able / quantifiable habits we surface in the journal.
 * Polarity ("positive" / "negative" / "neutral") describes the prior — what
 * the literature says is generally good or bad for recovery — and is used by
 * the UI for color, not by any algorithm. The Insights phase will measure
 * actual per-user effects from logged data.
 *
 * Slugs are stable identifiers persisted to the DB (behavior_logs.behavior_id),
 * so don't rename them — add new ones and deprecate old ones if needed.
 */

export type BehaviorCategory = "intake" | "sleep" | "mind" | "recovery" | "lifestyle";

export type BehaviorPolarity = "positive" | "negative" | "neutral";

export type Behavior = {
  id: string;                  // stable slug
  label: string;               // display name
  emoji: string;               // glyph for the toggle pill
  category: BehaviorCategory;
  polarity: BehaviorPolarity;
  /** If set, behavior takes a numeric quantity (cups, hours…) instead of a toggle. */
  unit?: string;
  /** Default quantity when the user taps it on for the first time. */
  defaultAmount?: number;
  /** Hint text shown under the tile. */
  hint?: string;
};

export const BEHAVIORS: Behavior[] = [
  // ── intake ───────────────────────────────────────────────────────────
  { id: "caffeine",        label: "Caffeine",        emoji: "☕", category: "intake",   polarity: "negative", unit: "cups", defaultAmount: 1, hint: "Late caffeine wrecks deep sleep" },
  { id: "alcohol",         label: "Alcohol",         emoji: "🍷", category: "intake",   polarity: "negative", unit: "drinks", defaultAmount: 1, hint: "Even one drink suppresses HRV" },
  { id: "late_meal",       label: "Late meal",       emoji: "🍽️", category: "intake",   polarity: "negative", hint: "Eating <3h before bed" },
  { id: "sugar",           label: "Sugar binge",     emoji: "🍩", category: "intake",   polarity: "negative" },
  { id: "hydration",       label: "Hydrated",        emoji: "💧", category: "intake",   polarity: "positive", hint: "≥2L of water today" },
  { id: "fasting",         label: "Fasting",         emoji: "⏳", category: "intake",   polarity: "neutral",  hint: ">14h without food" },

  // ── sleep prep ───────────────────────────────────────────────────────
  { id: "screen_late",     label: "Late screen",     emoji: "📱", category: "sleep",    polarity: "negative", hint: "Screen <1h before bed" },
  { id: "reading",         label: "Read in bed",     emoji: "📖", category: "sleep",    polarity: "positive" },
  { id: "no_alarm",        label: "Woke naturally",  emoji: "⏰", category: "sleep",    polarity: "positive" },
  { id: "nap",             label: "Nap",             emoji: "😴", category: "sleep",    polarity: "neutral",  unit: "min", defaultAmount: 20 },
  { id: "consistent_bed",  label: "Consistent bedtime", emoji: "🛏️", category: "sleep", polarity: "positive", hint: "Within 30 min of usual" },

  // ── mind ─────────────────────────────────────────────────────────────
  { id: "meditation",      label: "Meditation",      emoji: "🧘", category: "mind",     polarity: "positive", unit: "min", defaultAmount: 10 },
  { id: "breathwork",      label: "Breathwork",      emoji: "🌬️", category: "mind",     polarity: "positive" },
  { id: "journaling",      label: "Journaling",      emoji: "✍️", category: "mind",     polarity: "positive" },
  { id: "high_stress",     label: "High stress",     emoji: "😰", category: "mind",     polarity: "negative" },
  { id: "social_time",     label: "Social time",     emoji: "👥", category: "mind",     polarity: "positive" },

  // ── recovery ─────────────────────────────────────────────────────────
  { id: "stretching",      label: "Stretching",      emoji: "🤸", category: "recovery", polarity: "positive" },
  { id: "foam_rolling",    label: "Foam rolling",    emoji: "🧻", category: "recovery", polarity: "positive" },
  { id: "sauna",           label: "Sauna",           emoji: "🔥", category: "recovery", polarity: "positive" },
  { id: "cold_plunge",     label: "Cold plunge",     emoji: "🧊", category: "recovery", polarity: "positive" },
  { id: "massage",         label: "Massage",         emoji: "💆", category: "recovery", polarity: "positive" },
  { id: "active_recovery", label: "Active recovery", emoji: "🚶", category: "recovery", polarity: "positive", hint: "Easy walk / mobility" },

  // ── lifestyle ────────────────────────────────────────────────────────
  { id: "travel",          label: "Travel",          emoji: "✈️", category: "lifestyle",polarity: "neutral" },
  { id: "sick",            label: "Feeling sick",    emoji: "🤒", category: "lifestyle",polarity: "negative" },
  { id: "menstruating",    label: "Menstruating",    emoji: "🩸", category: "lifestyle",polarity: "neutral" },
  { id: "sex",             label: "Sex",             emoji: "❤️", category: "lifestyle",polarity: "positive" },
  { id: "outdoor_time",    label: "Outdoor time",    emoji: "🌳", category: "lifestyle",polarity: "positive", unit: "min", defaultAmount: 30 },
  { id: "sun_exposure",    label: "Morning sun",     emoji: "☀️", category: "lifestyle",polarity: "positive", hint: "10+ min within 1h of waking" },
  { id: "smoking",         label: "Smoked",          emoji: "🚬", category: "lifestyle",polarity: "negative" },
  { id: "supplements",     label: "Supplements",     emoji: "💊", category: "lifestyle",polarity: "neutral" },
];

export const BEHAVIORS_BY_ID: Record<string, Behavior> = Object.fromEntries(
  BEHAVIORS.map((b) => [b.id, b]),
);

export const CATEGORY_LABEL: Record<BehaviorCategory, string> = {
  intake: "Intake",
  sleep: "Sleep prep",
  mind: "Mind",
  recovery: "Recovery",
  lifestyle: "Lifestyle",
};

export const CATEGORY_ORDER: BehaviorCategory[] = [
  "intake", "sleep", "mind", "recovery", "lifestyle",
];

export function behaviorsByCategory(): Record<BehaviorCategory, Behavior[]> {
  const out = {} as Record<BehaviorCategory, Behavior[]>;
  for (const cat of CATEGORY_ORDER) out[cat] = [];
  for (const b of BEHAVIORS) out[b.category].push(b);
  return out;
}
