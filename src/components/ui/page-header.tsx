export function PageHeader({ kicker, title, description }: { kicker: string; title: string; description?: string }) {
  return (
    <header className="space-y-1">
      <p className="text-xs uppercase tracking-[0.25em] text-fg-muted">{kicker}</p>
      <h1 className="font-stat text-4xl">{title}</h1>
      {description && <p className="text-sm text-fg-muted pt-1">{description}</p>}
    </header>
  );
}

export function ComingSoon({ phase }: { phase: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-fg-dim">Coming in</p>
      <p className="mt-2 font-stat text-2xl">{phase}</p>
    </div>
  );
}
