"use client";

import { useEffect, useState, useCallback } from "react";
import { Mail, Phone, Globe, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Lead {
  id: string;
  businessName: string;
  city: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  score: number;
  priority: string;
  status: string;
  category: { name: string } | null;
}

const statuses = [
  "NEW",
  "QUALIFIED",
  "CONTACTED",
  "REPLIED",
  "INTERESTED",
  "MEETING",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
  "NOT_INTERESTED",
  "DO_NOT_CONTACT",
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ total: number; leads: Lead[] }>("/leads", {
        params: { q: search || undefined, status: statusFilter || undefined, pageSize: 50 },
      });
      setLeads(res.data.leads);
      setTotal(res.data.total);
    } catch {
      setToast("Could not load leads.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(id: string, status: string) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    try {
      await api.patch(`/leads/${id}`, { status });
    } catch {
      setToast("Could not update status.");
      load();
    }
  }

  async function sendEmail(id: string) {
    setSendingId(id);
    try {
      await api.post(`/email/send/${id}`);
      setToast("Email sent.");
      load();
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Could not send email.";
      setToast(message);
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">All Leads</h1>
          <p className="text-sm text-text-muted">{total} lead{total === 1 ? "" : "s"} in your CRM.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="h-9 w-48 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {toast && (
        <div className="rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm">
          {toast}
          <button onClick={() => setToast(null)} className="ml-3 text-text-muted hover:text-text">
            Dismiss
          </button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            </div>
          ) : leads.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-text-muted">
              No leads yet - use AI Lead Finder to discover your first batch.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-5 py-3 font-medium">Business</th>
                    <th className="px-5 py-3 font-medium">Category</th>
                    <th className="px-5 py-3 font-medium">City</th>
                    <th className="px-5 py-3 font-medium">Contact</th>
                    <th className="px-5 py-3 font-medium">Score</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-t border-border hover:bg-surface-2">
                      <td className="px-5 py-3 font-medium">{lead.businessName}</td>
                      <td className="px-5 py-3 text-text-muted">{lead.category?.name ?? "Uncategorized"}</td>
                      <td className="px-5 py-3 text-text-muted">{lead.city ?? "-"}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 text-text-muted">
                          {lead.email && <Mail className="h-3.5 w-3.5" />}
                          {lead.phone && <Phone className="h-3.5 w-3.5" />}
                          {lead.website && <Globe className="h-3.5 w-3.5" />}
                          {!lead.email && !lead.phone && !lead.website && <span className="text-xs">Not Found</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={lead.priority === "Hot" ? "success" : lead.priority === "Warm" ? "warning" : "neutral"}>
                          {lead.score}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={lead.status}
                          onChange={(e) => changeStatus(lead.id, e.target.value)}
                          className="h-8 rounded-lg border border-border bg-surface-2 px-2 text-xs outline-none"
                        >
                          {statuses.map((s) => (
                            <option key={s} value={s}>
                              {s.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!lead.email || sendingId === lead.id}
                          onClick={() => sendEmail(lead.id)}
                          title={!lead.email ? "No verified email on file" : "Send category template"}
                        >
                          {sendingId === lead.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Send Email"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}