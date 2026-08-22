"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface SearchResults {
  leads: { id: string; businessName: string; status: string }[];
  customers: { id: string; company: string }[];
  deals: { id: string; name: string; stage: string }[];
  projects: { id: string; name: string; status: string }[];
  orders: { id: string; orderNumber: string; total: number }[];
}

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const emptyResults: SearchResults = { leads: [], customers: [], deals: [], projects: [], orders: [] };

export function Topbar() {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [searching, setSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(emptyResults);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      api
        .get<SearchResults>("/search", { params: { q: query } })
        .then((res) => setResults(res.data))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    api
      .get<{ notifications: Notification[]; unreadCount: number }>("/notifications")
      .then((res) => {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setShowSearchDropdown(false);
      if (notifBoxRef.current && !notifBoxRef.current.contains(e.target as Node)) setShowNotifDropdown(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markAllRead() {
    await api.post("/notifications/mark-all-read");
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  const hasResults =
    results.leads.length + results.customers.length + results.deals.length + results.projects.length + results.orders.length > 0;

  function go(path: string) {
    setShowSearchDropdown(false);
    setQuery("");
    router.push(path);
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
      <div ref={searchBoxRef} className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowSearchDropdown(true)}
          placeholder="Search leads, customers, deals, projects..."
          className="h-10 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        {showSearchDropdown && query.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-12 z-30 max-h-96 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
            {searching ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
              </div>
            ) : !hasResults ? (
              <p className="p-4 text-center text-sm text-text-muted">No matches found.</p>
            ) : (
              <div className="divide-y divide-border">
                {results.leads.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">Leads</p>
                    {results.leads.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => go("/dashboard/leads")}
                        className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2"
                      >
                        {l.businessName} <span className="text-xs text-text-muted">- {l.status}</span>
                      </button>
                    ))}
                  </div>
                )}
                {results.customers.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">Customers</p>
                    {results.customers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => go("/dashboard/customers")}
                        className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2"
                      >
                        {c.company}
                      </button>
                    ))}
                  </div>
                )}
                {results.deals.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">Deals</p>
                    {results.deals.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => go("/dashboard/pipeline")}
                        className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2"
                      >
                        {d.name} <span className="text-xs text-text-muted">- {d.stage}</span>
                      </button>
                    ))}
                  </div>
                )}
                {results.projects.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">Projects</p>
                    {results.projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => go("/dashboard/projects")}
                        className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2"
                      >
                        {p.name} <span className="text-xs text-text-muted">- {p.status}</span>
                      </button>
                    ))}
                  </div>
                )}
                {results.orders.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">Orders</p>
                    {results.orders.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => go("/dashboard/orders")}
                        className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2"
                      >
                        {o.orderNumber}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div ref={notifBoxRef} className="relative">
          <button
            aria-label="Notifications"
            onClick={() => setShowNotifDropdown((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:text-primary hover:border-primary/40"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-danger" />}
          </button>
          {showNotifDropdown && (
            <div className="absolute right-0 top-11 z-30 w-80 rounded-lg border border-border bg-surface shadow-lg">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <p className="text-sm font-medium">Notifications</p>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-4 text-center text-sm text-text-muted">No notifications yet.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`border-b border-border px-3 py-2.5 text-sm last:border-b-0 ${!n.read ? "bg-primary/5" : ""}`}
                    >
                      <p>{n.message}</p>
                      <p className="mt-0.5 text-xs text-text-muted">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <ThemeToggle />
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-display text-sm font-semibold">
            {user?.name?.charAt(0).toUpperCase() ?? "A"}
          </div>
          <div className="hidden lg:block leading-tight">
            <p className="text-sm font-medium">{user?.name ?? "..."}</p>
            <p className="text-[11px] text-text-muted">{user?.role.replace("_", " ") ?? ""}</p>
          </div>
        </div>
      </div>
    </header>
  );
}