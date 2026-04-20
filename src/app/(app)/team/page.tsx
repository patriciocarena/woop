import { PageHeader, ComingSoon } from "@/components/ui/page-header";

export const metadata = { title: "Team · Woop" };

export default function TeamPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Team"
        title="Compare with friends"
        description="Private leaderboards and shared recovery/sleep metrics."
      />
      <ComingSoon phase="Phase 9" />
    </div>
  );
}
