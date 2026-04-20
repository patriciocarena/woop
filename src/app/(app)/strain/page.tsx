import { PageHeader, ComingSoon } from "@/components/ui/page-header";

export const metadata = { title: "Strain · Woop" };

export default function StrainPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Strain"
        title="Day strain"
        description="Workout & ambient cardiovascular load on a 0–21 Borg scale."
      />
      <ComingSoon phase="Phase 4" />
    </div>
  );
}
