import { PageHeader } from "@/components/ui/page-header";
import { TrendsPageClient } from "./TrendsPageClient";

export const metadata = { title: "Trends · Woop" };

export default function TrendsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Trends"
        title="Insights & history"
        description="Rolling averages, behavior correlations and weekly performance assessments."
      />
      <TrendsPageClient />
    </div>
  );
}
