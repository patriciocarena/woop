import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Sign in · Woop" };

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="font-stat text-5xl tracking-tighter">WOOP</h1>
          <p className="mt-3 text-sm text-fg-muted">Recovery, strain & sleep — without the wearable.</p>
        </div>
        <div className="space-y-3">
          <Button className="w-full" disabled>
            Continue with Google
          </Button>
          <Button variant="outline" className="w-full" disabled>
            Continue with email
          </Button>
          <p className="text-[11px] text-fg-dim">
            Auth wires up later in Phase 1 once Supabase env keys are set.
          </p>
        </div>
        <Link href="/today" className="text-xs uppercase tracking-widest text-fg-muted hover:text-fg">
          Skip to demo →
        </Link>
      </div>
    </div>
  );
}
