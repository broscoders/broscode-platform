"use client";

import { Bell, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function Topbar() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          placeholder="Search leads, customers, deals, projects…"
          className="h-10 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:text-primary hover:border-primary/40"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-danger" />
        </button>
        <ThemeToggle />
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-display text-sm font-semibold">
            A
          </div>
          <div className="hidden lg:block leading-tight">
            <p className="text-sm font-medium">Admin</p>
            <p className="text-[11px] text-text-muted">Super Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
