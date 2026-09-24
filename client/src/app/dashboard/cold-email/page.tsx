"use client";

import { useEffect, useState, useCallback } from "react";
import { Send, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface CallableLead {
  id: string;
  businessName: string;
  email: string | null;
  city: string | null;
  status: string;
}

interface EmailLogRow {
  id: string;
  subject: string;
  recipient: string;
  status: string;
  sentAt: string;
  lead: { id: string; businessName: string; email: string | null } | null;
}

interface FollowUpRow {
  id: string;
  dayOffset: number;
  dueDate: string;
  lead: { id: string; businessName: string; email: string | null; status: string };
}

const STATUS_VARIANT: Record<string, "success" | "danger" | "neutral"> = {
  sent: "success",
  failed: "danger",
};

export default function ColdEmailPage() {
  const [leads, setLeads] = useState<CallableLead[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<EmailLogRow[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    const res = await api.get("/leads", { params: { hasEmail: "true", pageSize: 50 } });
    setLeads(res.data.leads.filter((l: CallableLead) => l.status !== "DO_NOT_CONTACT" && l.status !== "WON"));
  }, []);

  const loadLogs = useCallback(async () => {
    const res = await api.get("/cold-email/log", { params: { pageSize: 30 } });
    setLogs(res.data.logs);
  }, []);

  const loadFollowUps = useCallback(async () => {
    const res = await api.get("/cold-email/follow-ups");
    setFollowUps(res.data);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadLeads(), loadLogs(), loadFollowUps()]).finally(() => setLoading(false));
  }, [loadLeads, loadLogs, loadFollowUps]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSend() {
    if (selected.size === 0) return;
    setSending(true);
    setError(null);
    try {
      await api.post("/cold-email/ai-campaign/start", { leadIds: Array.from(selected) });
      setSelected(new Set());
      await Promise.all([loadLeads(), loadLogs(), loadFollowUps()]);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Couldn't send. Check your email account is connected in Settings.";
      setError(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">AI Cold Email</h1>
          <p className="text-sm text-text-muted">
            AI writes a personalized email per lead and sends it — plus two automatic follow-ups (day 3 and day 7) if there&apos;s no reply.
          </p>
        </div>
        <Button onClick={handleSend} disabled={selected.size === 0 || sending} className="gap-2 shrink-0">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending ? "Sending..." : `Email ${selected.size || ""} Lead${selected.size === 1 ? "" : "s"}`.trim()}
        </Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="bracket-marker">Leads ready to email</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-5 py-8 text-center text-sm text-text-muted">Loading...</p>
          ) : leads.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-text-muted">
              No leads with a verified email. Find some in AI Lead Finder first.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="w-10 px-5 py-3" />
                    <th className="px-5 py-3 font-medium">Business</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">City</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="cursor-pointer border-t border-border hover:bg-surface-2"
                      onClick={() => toggle(lead.id)}
                    >
                      <td className="px-5 py-3">
                        <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggle(lead.id)} />
                      </td>
                      <td className="px-5 py-3 font-medium">{lead.businessName}</td>
                      <td className="px-5 py-3 text-text-muted">{lead.email}</td>
                      <td className="px-5 py-3 text-text-muted">{lead.city ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {followUps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="bracket-marker flex items-center gap-2">
              <Clock className="h-4 w-4" /> Scheduled follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {followUps.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{f.lead.businessName}</span>
                <span className="text-text-muted">
                  Day {f.dayOffset} · {new Date(f.dueDate).toLocaleDateString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="bracket-marker">Sent log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-text-muted">No emails sent yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-5 py-3 font-medium">Business</th>
                    <th className="px-5 py-3 font-medium">Subject</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-t border-border hover:bg-surface-2">
                      <td className="px-5 py-3 font-medium">{log.lead?.businessName ?? log.recipient}</td>
                      <td className="px-5 py-3 text-text-muted">{log.subject}</td>
                      <td className="px-5 py-3">
                        <Badge variant={STATUS_VARIANT[log.status] ?? "neutral"}>{log.status}</Badge>
                      </td>
                      <td className="px-5 py-3 text-text-muted">{new Date(log.sentAt).toLocaleString()}</td>
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
