import { PageHeader } from "@/components/ui/page-header";
import { HealthClient } from "./HealthClient";

export const metadata = { title: "Health · Woop" };

export default function HealthPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Health Monitor"
        title="Vitals"
        description="HRV, resting HR, respiratory rate and (when imported from Apple Health) blood oxygen, sleeping wrist temperature, and walking HR. Cards hide when there's no data."
      />
      <HealthClient />
    </div>
  );
}
