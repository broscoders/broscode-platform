"use client";

import { useEffect, useState, useCallback } from "react";
import { PhoneCall, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface CallableLead {
  id: string;
  businessName: string;
  phone: string | null;
  city: string | null;
  status: string;
}

interface TranscriptTurn {
  role: "agent" | "caller";
  text: string;
  at: string;
}

interface CallRow {
  id: string;
  status: string;
  outcome: string | null;
  summary: string | null;
  transcript: TranscriptTurn[] | null;
  durationSeconds: number | null;
  createdAt: string;
  lead: { id: string; businessName: string; phone: string | null; city: string | null };
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral" | "default"> = {
  COMPLETED: "success",
  IN_PROGRESS: "warning",
  RINGING: "warning",
  QUEUED: "neutral",
  NO_ANSWER: "neutral",
  BUSY: "neutral",
  FAILED: "danger",
};

const OUTCOME_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  INTERESTED: "success",
  CALLBACK_REQUESTED: "warning",
  NOT_INTERESTED: "danger",
  WRONG_NUMBER: "neutral",
  UNDETERMINED: "neutral",
};

export default function ColdCallingPage() {
  const [leads, setLeads] = useState<CallableLead[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    const res = await api.get("/leads", {
      params: { hasPhone: "true", pageSize: 50 },
    });
    setLeads(res.data.leads.filter((l: CallableLead) => l.status !== "DO_NOT_CONTACT" && l.status !== "WON"));
  }, []);

  const loadCalls = useCallback(async () => {
    const res = await api.get("/calls", { params: { pageSize: 30 } });
    setCalls(res.data.calls);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadLeads(), loadCalls()]).finally(() => setLoading(false));
  }, [loadLeads, loadCalls]);

  // Poll for live transcript/status updates while any call is in flight
  useEffect(() => {
    const hasActive = calls.some((c) => c.status === "QUEUED" || c.status === "RINGING" || c.status === "IN_PROGRESS");
    if (!hasActive) return;
    const interval = setInterval(loadCalls, 4000);
    return () => clearInterval(interval);
  }, [calls, loadCalls]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleStartCalls() {
    if (selected.size === 0) return;
    setStarting(true);
    setError(null);
    try {
      await api.post("/calls/start", { leadIds: Array.from(selected) });
      setSelected(new Set());
      await Promise.all([loadLeads(), loadCalls()]);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Couldn't start calls. Check Twilio setup in server/.env.";
      setError(message);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">AI Cold Calling</h1>
          <p className="text-sm text-text-muted">
            Pick leads with a phone number — the AI agent calls them, has the conversation, and marks interested leads automatically.
          </p>
        </div>
        <Button onClick={handleStartCalls} disabled={selected.size === 0 || starting} className="gap-2 shrink-0">
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
          {starting ? "Starting..." : `Call ${selected.size || ""} Lead${selected.size === 1 ? "" : "s"}`.trim()}
        </Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="bracket-marker">Leads ready to call</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-5 py-8 text-center text-sm text-text-muted">Loading...</p>
          ) : leads.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-text-muted">
              No new leads with a phone number. Find some in AI Lead Finder first.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="w-10 px-5 py-3" />
                    <th className="px-5 py-3 font-medium">Business</th>
                    <th className="px-5 py-3 font-medium">Phone</th>
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
                      <td className="px-5 py-3 text-text-muted">{lead.phone}</td>
                      <td className="px-5 py-3 text-text-muted">{lead.city ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="bracket-marker">Call log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {calls.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-text-muted">No calls placed yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {calls.map((call) => (
                <div key={call.id}>
                  <button
                    onClick={() => setExpanded(expanded === call.id ? null : call.id)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left hover:bg-surface-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{call.lead.businessName}</p>
                      <p className="truncate text-xs text-text-muted">{call.summary ?? call.lead.phone}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={STATUS_VARIANT[call.status] ?? "neutral"}>{call.status.replace("_", " ")}</Badge>
                      {call.outcome && (
                        <Badge variant={OUTCOME_VARIANT[call.outcome] ?? "neutral"}>{call.outcome.replace("_", " ")}</Badge>
                      )}
                      {expanded === call.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>
                  {expanded === call.id && (
                    <div className="space-y-2 bg-surface-2/50 px-5 py-4">
                      {(call.transcript ?? []).length === 0 ? (
                        <p className="text-xs text-text-muted">No transcript yet — call hasn&apos;t connected.</p>
                      ) : (
                        call.transcript!.map((turn, i) => (
                          <p key={i} className="text-sm">
                            <span className={turn.role === "agent" ? "font-medium text-primary" : "font-medium"}>
                              {turn.role === "agent" ? "Sara: " : "Them: "}
                            </span>
                            {turn.text}
                          </p>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
