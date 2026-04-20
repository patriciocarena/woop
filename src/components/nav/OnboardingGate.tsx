"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfileStore } from "@/lib/store/profile";
import { useHydrated } from "@/lib/hooks/use-hydrated";

/** Redirects to /onboarding on first visit — once completed, noop. */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const completed = useProfileStore((s) => s.onboardingCompleted);
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (!completed) router.replace("/onboarding");
  }, [hydrated, completed, router]);

  return <>{children}</>;
}
