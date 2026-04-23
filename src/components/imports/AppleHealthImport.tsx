"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { parseAppleHealth, type ParseResult } from "@/lib/imports/apple-health";
import { applyAppleHealthImport, type ApplySummary } from "@/lib/imports/apply";

type Stage =
  | { kind: "idle" }
  | { kind: "parsing" }
  | { kind: "parsed"; result: ParseResult; fileName: string; sizeMB: number }
  | { kind: "applied"; summary: ApplySummary }
  | { kind: "error"; message: string };

export function AppleHealthImport() {
  const [stage, setStage] = useState<Stage>({ kind: "idle" });

  async function handleFile(file: File) {
    if (!file.name.endsWith(".xml")) {
      setStage({ kind: "error", message: "Subí el archivo export.xml (unzippeá export.zip primero)." });
      return;
    }
    setStage({ kind: "parsing" });
    try {
      const text = await file.text();
      const result = parseAppleHealth(text);
      setStage({ kind: "parsed", result, fileName: file.name, sizeMB: file.size / 1_048_576 });
    } catch (e) {
      setStage({ kind: "error", message: e instanceof Error ? e.message : "Failed to parse" });
    }
  }

  function apply() {
    if (stage.kind !== "parsed") return;
    const summary = applyAppleHealthImport(stage.result);
    setStage({ kind: "applied", summary });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Apple Health</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-fg-muted">
          Desde tu iPhone: <span className="text-fg">Salud → Perfil → Exportar todos los datos</span>.
          Te manda un <code className="font-mono text-xs">export.zip</code>. Descomprimilo y subí
          <code className="font-mono text-xs"> export.xml</code> acá.
        </p>

        {stage.kind === "idle" && (
          <label className="block">
            <span className="sr-only">Elegir export.xml</span>
            <input
              type="file"
              accept=".xml"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
              className="block w-full text-sm text-fg-muted file:mr-3 file:rounded-full file:border-0 file:bg-fg file:text-bg file:px-4 file:py-2 file:text-xs file:font-medium hover:file:opacity-90"
            />
          </label>
        )}

        {stage.kind === "parsing" && (
          <p className="text-sm text-fg-muted">Parseando… (esto puede tardar en exports grandes)</p>
        )}

        {stage.kind === "parsed" && (
          <div className="space-y-3">
            <p className="text-xs text-fg-dim">
              {stage.fileName} · {stage.sizeMB.toFixed(1)} MB
            </p>
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between"><span className="text-fg-muted">Sleep sessions</span> <span className="font-stat">{stage.result.sleep.length}</span></li>
              <li className="flex justify-between"><span className="text-fg-muted">Recovery days (HRV + RHR)</span> <span className="font-stat">{stage.result.recovery.length}</span></li>
              <li className="flex justify-between"><span className="text-fg-muted">Workouts</span> <span className="font-stat">{stage.result.workouts.length}</span></li>
              <li className="flex justify-between"><span className="text-fg-muted">Vitals (SpO2 + temp + walking HR)</span> <span className="font-stat">{stage.result.vitals.spo2.length + stage.result.vitals.wristTemp.length + stage.result.vitals.walkingHr.length}</span></li>
            </ul>
            {stage.result.sleep.length + stage.result.recovery.length + stage.result.workouts.length + stage.result.vitals.spo2.length + stage.result.vitals.wristTemp.length + stage.result.vitals.walkingHr.length > 0 ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={apply}>Importar</Button>
                <Button size="sm" variant="outline" onClick={() => setStage({ kind: "idle" })}>Cancelar</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setStage({ kind: "idle" })}>Subir otro archivo</Button>
            )}
          </div>
        )}

        {stage.kind === "applied" && (
          <div className="space-y-2">
            <p className="text-sm">Listo. Se importaron:</p>
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between"><span className="text-fg-muted">Sleep</span> <span className="font-stat">+{stage.summary.sleepAdded} <span className="text-fg-dim text-xs">({stage.summary.sleepSkipped} duplicados)</span></span></li>
              <li className="flex justify-between"><span className="text-fg-muted">Recovery</span> <span className="font-stat">+{stage.summary.recoveryAdded} <span className="text-fg-dim text-xs">({stage.summary.recoverySkipped} duplicados)</span></span></li>
              <li className="flex justify-between"><span className="text-fg-muted">Workouts</span> <span className="font-stat">+{stage.summary.workoutsAdded} <span className="text-fg-dim text-xs">({stage.summary.workoutsSkipped} duplicados)</span></span></li>
              <li className="flex justify-between"><span className="text-fg-muted">Vitals</span> <span className="font-stat">+{stage.summary.vitalsAdded}</span></li>
            </ul>
            <Button size="sm" variant="outline" onClick={() => setStage({ kind: "idle" })}>Importar otro archivo</Button>
          </div>
        )}

        {stage.kind === "error" && (
          <div className="space-y-2">
            <div className="rounded-lg border border-recovery-low/40 bg-recovery-low/10 px-3 py-2 text-xs text-recovery-low">
              {stage.message}
            </div>
            <Button size="sm" variant="outline" onClick={() => setStage({ kind: "idle" })}>Reintentar</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
