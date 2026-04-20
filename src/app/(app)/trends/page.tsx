import { PageHeader, ComingSoon } from "@/components/ui/page-header";

export const metadata = { title: "Trends · Woop" };

export default function TrendsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Trends"
        title="Insights & history"
        description="Rolling averages, behavior correlations and weekly performance assessments."
      />
      <ComingSoon phase="Phase 6" />
    </div>
  );
}
