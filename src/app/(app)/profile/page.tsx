import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Profile · Woop" };

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <PageHeader kicker="Profile" title="Your account" />
      <Card>
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-fg-muted">Auth lands later in Phase 1 — Supabase connection placeholder.</p>
          <Button variant="outline" size="sm" className="mt-3">Sign out</Button>
        </CardContent>
      </Card>
    </div>
  );
}
