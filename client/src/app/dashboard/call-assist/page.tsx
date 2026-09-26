"use client";

import { useEffect, useState, useCallback } from "react";
import { Headset, Loader2, Phone, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

interface CallableLead {
  id: string;
  businessName: string;
  phone: string | null;
  city: string | null;
  status: string;
}

interface CallScript {
  opener: string;
  talkingPoints: string[];
  objections: { objection: string; response: string }[];
  closing: string;
}

interface ActiveCall {
  callId: string;
  phone: string;
  businessName: string;
  script: CallScript;
}

const OUTCOMES: { key: string; label: string; variant: "success" | "danger" | "warning" | "neutral" }[] = [
  { key: "INTERESTED", label: "Interested", variant: "success" },
  { key: "NOT_INTERESTED", label: "Not Interested", variant: "danger" },
  { key: "CALLBACK_REQUESTED", label: "Callback Requested", variant: "warning" },
  { key: "VOICEMAIL", label: "Left Voicemail", variant: "neutral" },
  { key: "NO_ANSWER", label: "No Answer", variant: "neutral" },
  { key: "WRONG_NUMBER", label: "Wrong Number", variant: "neutral" },
];

export default function CallAssistPage() {
  const [leads, setLeads] = useState<CallableLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveCall | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    const res = await api.get("/leads", { params: { hasPhone: "true", pageSize: 50 } });
    setLeads(res.data.leads.filter((l: CallableLead) => l.status !== "DO_NOT_CONTACT" && l.status !== "WON"));
  }, []);

  useEffect(() => {
    setLoading(true);
    loadLeads().finally(() => setLoading(false));
  }, [loadLeads]);

  async function startCall(leadId: string) {
    setStarting(leadId);
    setError(null);
    try {
      const res = await api.post("/calls/assist/start", { leadId });
      setActive(res.data);
      setNotes("");
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Could not generate a script.";
      setError(message);
    } finally {
      setStarting(null);
    }
  }

  async function submitOutcome(outcome: string) {
    if (!active) return;
    setSubmitting(outcome);
    try {
      await api.post(`/calls/assist/${active.callId}/complete`, { outcome, notes: notes || undefined });
      setActive(null);
      await loadLeads();
    } catch {
      setError("Could not save the outcome. Please try again.");
    } finally {
      setSubmitting(null);
    }
  }

  function copyPhone() {
    if (!active) return;
    navigator.clipboard.writeText(active.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (active) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">{active.businessName}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-text-muted">
            <a href={`tel:${active.phone}`} className="flex items-center gap-1.5 text-primary hover:underline">
              <Phone className="h-4 w-4" /> {active.phone}
            </a>
            <button onClick={copyPhone} className="flex items-center gap-1 text-text-muted hover:text-text">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Dial this number from your own phone now. This screen just preps what to say — no telephony is involved.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="bracket-marker">Opener</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{active.script.opener}</p>
          </CardContent>
        </Card>

        {active.script.talkingPoints.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="bracket-marker">Talking points</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1.5 pl-5 text-sm">
                {active.script.talkingPoints.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {active.script.objections.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="bracket-marker">If they push back</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {active.script.objections.map((o, i) => (
                <div key={i} className="text-sm">
                  <p className="font-medium text-text-muted">&ldquo;{o.objection}&rdquo;</p>
                  <p>{o.response}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="bracket-marker">Closing line</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{active.script.closing}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="bracket-marker">After the call — what happened?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about the call..."
              rows={2}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="flex flex-wrap gap-2">
              {OUTCOMES.map((o) => (
                <Button
                  key={o.key}
                  variant="outline"
                  disabled={submitting !== null}
                  onClick={() => submitOutcome(o.key)}
                  className="gap-2"
                >
                  {submitting === o.key && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {o.label}
                </Button>
              ))}
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
          </CardContent>
        </Card>

        <Button variant="ghost" onClick={() => setActive(null)}>
          Cancel — back to lead list
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">Call Assist (Free)</h1>
        <p className="text-sm text-text-muted">
          AI writes a script for each lead — you dial from your own phone (no Twilio, no cost). Report the outcome after and the CRM updates itself.
        </p>
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
              No leads with a phone number. Find some in AI Lead Finder first.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-5 py-3 font-medium">Business</th>
                    <th className="px-5 py-3 font-medium">Phone</th>
                    <th className="px-5 py-3 font-medium">City</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-t border-border hover:bg-surface-2">
                      <td className="px-5 py-3 font-medium">{lead.businessName}</td>
                      <td className="px-5 py-3 text-text-muted">{lead.phone}</td>
                      <td className="px-5 py-3 text-text-muted">{lead.city ?? "—"}</td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          size="sm"
                          disabled={starting !== null}
                          onClick={() => startCall(lead.id)}
                          className="gap-2"
                        >
                          {starting === lead.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Headset className="h-3.5 w-3.5" />
                          )}
                          Get Script
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
