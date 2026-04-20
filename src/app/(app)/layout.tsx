import { AppShell } from "@/components/nav/AppShell";
import { OnboardingGate } from "@/components/nav/OnboardingGate";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingGate>
      <AppShell>{children}</AppShell>
    </OnboardingGate>
  );
}
