import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppleHealthImport } from "@/components/imports/AppleHealthImport";
import { LockedIntegration } from "@/components/imports/LockedIntegration";

export const metadata = { title: "Profile · Woop" };

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <PageHeader kicker="Profile" title="Your account" />

      <Card>
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-fg-muted">Auth lands later — Supabase connection placeholder.</p>
          <Button variant="outline" size="sm" className="mt-3">Sign out</Button>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-sm uppercase tracking-[0.18em] text-fg-muted">Imports</h2>
        <AppleHealthImport />
        <LockedIntegration
          name="Strava"
          description="Sincronizá automáticamente tus workouts y FC de Strava. Requiere registrar una app OAuth (gratis)."
          envVars={["STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET"]}
        />
        <LockedIntegration
          name="Google Fit"
          description="Importá sueño y frecuencia cardíaca desde Google Fit. Requiere un proyecto Google Cloud (gratis)."
          envVars={["GOOGLE_FIT_CLIENT_ID", "GOOGLE_FIT_CLIENT_SECRET"]}
        />
      </section>
    </div>
  );
}
