"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { navGroups } from "@/lib/nav-items";
import { useAuth } from "@/lib/auth-context";

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { isAdmin, loading } = useAuth();

  return (
    <>
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
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => !item.adminOnly || loading || isAdmin);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-text-muted/70">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
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
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <p className="text-[10px] text-text-muted">We code your ideas.</p>
      </div>
    </>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-surface">
        <SidebarContent />
      </aside>

      <button
        aria-label="Open menu"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-text shadow-sm"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex w-72 max-w-[85vw] flex-col bg-surface border-r border-border">
            <button
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}