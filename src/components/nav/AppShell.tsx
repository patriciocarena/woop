import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="flex-1 pb-24 md:pb-8">
        <div className="mx-auto w-full max-w-3xl px-5 py-6">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
