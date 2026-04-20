"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRecoveryStore } from "@/lib/store/recovery";
import { useSleepStore } from "@/lib/store/sleep";
import { useStrainStore } from "@/lib/store/strain";
import { useJournalStore } from "@/lib/store/journal";
import { useCoachStore, selectInsightFor } from "@/lib/store/coach";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { buildCoachContext } from "@/lib/ai/build-context";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

type ErrorState = { kind: "missing_api_key" | "rate_limited" | "auth_failed" | "upstream" | "network"; message?: string };

export function DailyCoach() {
  const hydrated = useHydrated();
  const recovery = useRecoveryStore((s) => s.entries);
  const sleep = useSleepStore((s) => s.sessions);
  const workouts = useStrainStore((s) => s.workouts);
  const journal = useJournalStore((s) => s.entries);

  const today = todayISO();
  const insight = useCoachStore(selectInsightFor(today));
  const setInsight = useCoachStore((s) => s.set);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/coach")
      .then((r) => r.json())
      .then((b) => { if (!cancelled) setConfigured(!!b.configured); })
      .catch(() => { if (!cancelled) setConfigured(false); });
    return () => { cancelled = true; };
  }, []);

  const hasAnyData = hydrated && (recovery.length > 0 || sleep.length > 0 || workouts.length > 0);

  const context = useMemo(() => {
    if (!hydrated) return null;
    return buildCoachContext({ today, recovery, sleep, workouts, journal });
  }, [hydrated, today, recovery, sleep, workouts, journal]);

  const run = useCallback(async () => {
    if (!context) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ context, lang: "es" }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError({ kind: body.error ?? "upstream", message: body.message });
        return;
      }
      setInsight({
        date: today,
        headline: body.headline,
        recommendations: body.recommendations,
        strainTarget: body.strainTarget,
        generatedAt: new Date().toISOString(),
      });
    } catch (e) {
      setError({ kind: "network", message: e instanceof Error ? e.message : "unknown" });
    } finally {
      setLoading(false);
    }
  }, [context, setInsight, today]);

  if (!hydrated) {
    return (
      <Card>
        <CardHeader><CardTitle>Coach</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-fg-muted">Loading…</p></CardContent>
      </Card>
    );
  }

  if (configured === false && !insight) {
    return (
      <Card>
        <CardHeader><CardTitle>Coach</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-fg-muted">
            Esta función usa IA (Claude) para generar un briefing diario basado en tus últimos 30 días.
          </p>
          <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-fg-muted">
            Agregá <code className="font-mono text-fg">ANTHROPIC_API_KEY</code> en <code className="font-mono text-fg">.env.local</code> para acceder a esta función.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coach</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insight ? (
          <>
            <p className="text-base">{insight.headline}</p>
            <ul className="space-y-2">
              {insight.recommendations.map((r, i) => (
                <li key={i} className="rounded-lg bg-surface-2 px-3 py-2">
                  <div className="text-sm font-medium">{r.title}</div>
                  <div className="text-xs text-fg-muted mt-0.5">{r.detail}</div>
                </li>
              ))}
            </ul>
            {insight.strainTarget && (
              <p className="text-xs text-fg-dim border-t border-border pt-2">
                <span className="uppercase tracking-widest">Strain target:</span> {insight.strainTarget}
              </p>
            )}
            <div className="flex items-center justify-between text-[11px] text-fg-dim pt-1">
              <span>Generated {timeAgo(insight.generatedAt)}</span>
              <button
                type="button"
                onClick={run}
                disabled={loading}
                className="rounded-full border border-border px-3 py-1 text-fg-muted hover:text-fg disabled:opacity-50"
              >
                {loading ? "Thinking…" : "Refresh"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-fg-muted">
              {hasAnyData
                ? "Generate today's briefing from your last 30 days — sleep, recovery, strain, and behavior correlations."
                : "Log a sleep entry and a morning HRV reading first — the coach needs data to work with."}
            </p>
            <button
              type="button"
              onClick={run}
              disabled={loading || !hasAnyData}
              className="w-full rounded-full bg-fg text-bg py-2 text-sm font-medium disabled:opacity-40"
            >
              {loading ? "Thinking…" : "Generate today's briefing"}
            </button>
          </>
        )}
        {error && <ErrorBanner state={error} />}
      </CardContent>
    </Card>
  );
}

function ErrorBanner({ state }: { state: ErrorState }) {
  const label = (() => {
    switch (state.kind) {
      case "missing_api_key":
        return "Set ANTHROPIC_API_KEY in .env.local and restart the dev server.";
      case "auth_failed":
        return "Anthropic rejected the API key — check it in .env.local.";
      case "rate_limited":
        return "Rate limited by Anthropic. Try again in a minute.";
      case "network":
        return `Network error: ${state.message ?? "unknown"}`;
      default:
        return state.message ? `Upstream error: ${state.message}` : "Upstream error.";
    }
  })();
  return (
    <div className="rounded-lg border border-recovery-low/40 bg-recovery-low/10 px-3 py-2 text-xs text-recovery-low">
      {label}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
