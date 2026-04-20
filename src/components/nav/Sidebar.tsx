"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-surface px-4 py-6">
      <Link
        href="/today"
        className="mb-8 px-2 font-stat text-3xl tracking-tighter text-fg"
      >
        WOOP
      </Link>
      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-surface-2 text-fg"
                  : "text-fg-muted hover:text-fg hover:bg-surface-2"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-3 text-[10px] uppercase tracking-widest text-fg-dim">
        v0.1 · MVP
      </div>
    </aside>
  );
}
