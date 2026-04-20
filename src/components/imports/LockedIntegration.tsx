"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LockedIntegration({
  name,
  description,
  envVars,
}: {
  name: string;
  description: string;
  envVars: string[];
}) {
  return (
    <Card>
      <CardHeader><CardTitle>{name}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-fg-muted">{description}</p>
        <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-fg-muted">
          Agregá {envVars.map((v, i) => (
            <span key={v}>
              {i > 0 && " y "}
              <code className="font-mono text-fg">{v}</code>
            </span>
          ))} en <code className="font-mono text-fg">.env.local</code> para habilitar esta integración.
        </div>
      </CardContent>
    </Card>
  );
}
