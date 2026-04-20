import { PageHeader, ComingSoon } from "@/components/ui/page-header";

export const metadata = { title: "Journal · Woop" };

export default function JournalPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Journal"
        title="Behaviors & notes"
        description="Log daily behaviors so we can correlate them with your recovery."
      />
      <ComingSoon phase="Phase 5" />
    </div>
  );
}
