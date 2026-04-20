import { PageHeader } from "@/components/ui/page-header";
import { StrainPageClient } from "./StrainPageClient";

export const metadata = { title: "Strain · Woop" };

export default function StrainPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Strain"
        title="Day strain"
        description="Workout & ambient cardiovascular load on a 0–21 Borg scale."
      />
      <StrainPageClient />
    </div>
  );
}
