import { PageHeader, ComingSoon } from "@/components/ui/page-header";

export const metadata = { title: "Recovery · Woop" };

export default function RecoveryPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Recovery"
        title="Daily recovery"
        description="HRV + RHR + sleep + respiratory rate combined into your readiness score."
      />
      <ComingSoon phase="Phase 3" />
    </div>
  );
}
