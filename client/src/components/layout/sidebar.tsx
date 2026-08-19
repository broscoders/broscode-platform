"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navGroups } from "@/lib/nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="relative h-9 w-9 overflow-hidden rounded-lg">
          <Image src="/logo.jpg" alt="Bro's Code" fill className="object-cover" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-sm font-semibold tracking-tight">Bro&apos;s Code</p>
          <p className="text-[10px] uppercase tracking-widest text-text-muted">Ops Platform</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-text-muted/70">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors relative",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-text-muted hover:bg-surface-2 hover:text-text"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-primary" />
                    )}
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {active && (
                      <span className="ml-auto font-data text-[10px] opacity-60">{"</>"}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <p className="text-[10px] text-text-muted">We code your ideas.</p>
      </div>
    </aside>
  );
}
