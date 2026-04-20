import { PageHeader, ComingSoon } from "@/components/ui/page-header";

export const metadata = { title: "Sleep · Woop" };

export default function SleepPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Sleep"
        title="Sleep performance"
        description="Manual logging, sleep need vs achieved, efficiency and consistency."
      />
      <ComingSoon phase="Phase 2" />
    </div>
  );
}
