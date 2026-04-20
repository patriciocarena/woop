import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecoveryRing, StrainRing, SleepRing } from "@/components/metrics/RecoveryRing";

export const metadata = { title: "Today · Woop" };

export default function TodayPage() {
  // Hard-coded sample data for Fase 1 — wired up in later phases.
  const recovery = 72;
  const strain = 11.4;
  const sleep = 84;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-fg-muted">Today</p>
        <h1 className="font-stat text-4xl mt-1">Good morning</h1>
      </header>

      <div className="flex justify-center">
        <RecoveryRing value={recovery} size={260} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="flex flex-col items-center">
          <CardHeader className="w-full"><CardTitle>Strain</CardTitle></CardHeader>
          <StrainRing value={strain} size={140} />
        </Card>
        <Card className="flex flex-col items-center">
          <CardHeader className="w-full"><CardTitle>Sleep</CardTitle></CardHeader>
          <SleepRing value={sleep} size={140} />
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Insight</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-fg-muted">
            AI coaching arrives in Phase 7 — for now this is a placeholder so the layout breathes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
