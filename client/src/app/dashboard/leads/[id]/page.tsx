"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, Globe, Loader2, Send, Play, Square, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Activity {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

interface FollowUp {
  id: string;
  label: string;
  dueDate: string;
  status: string;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
}

interface EmailLog {
  id: string;
  subject: string;
  status: string;
  sentAt: string;
}

interface LeadDetail {
  id: string;
  businessName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  score: number;
  priority: string;
  status: string;
  category: { name: string } | null;
  activities: Activity[];
  followUps: FollowUp[];
  notes: Note[];
  emailLogs: EmailLog[];
}

const statuses = [
  "NEW", "QUALIFIED", "CONTACTED", "REPLIED", "INTERESTED", "MEETING",
  "PROPOSAL", "NEGOTIATION", "WON", "LOST", "NOT_INTERESTED", "DO_NOT_CONTACT",
];

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<LeadDetail>(`/leads/${params.id}`);
      setLead(res.data);
    } catch {
      setToast("Could not load this lead.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(status: string) {
    if (!lead) return;
    setLead({ ...lead, status });
    await api.patch(`/leads/${lead.id}`, { status });
    load();
  }

  async function sendEmail() {
    if (!lead) return;
    setBusy(true);
    try {
      await api.post(`/email/send/${lead.id}`);
      setToast("Email sent.");
      load();
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Could not send email.";
      setToast(message);
    } finally {
      setBusy(false);
    }
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!lead || !noteText.trim()) return;
    await api.post(`/leads/${lead.id}/notes`, { content: noteText });
    setNoteText("");
    load();
  }

  async function startFollowUps() {
    if (!lead) return;
    setBusy(true);
    try {
      await api.post(`/leads/${lead.id}/follow-ups/start`);
      setToast("Follow-up sequence started.");
      load();
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Could not start follow-ups.";
      setToast(message);
    } finally {
      setBusy(false);
    }
  }

  async function stopFollowUps() {
    if (!lead) return;
    await api.post(`/leads/${lead.id}/follow-ups/stop`);
    load();
  }

  async function convertToCustomer() {
    if (!lead) return;
    setBusy(true);
    try {
      await api.post("/customers", {
        company: lead.businessName,
        contactPerson: lead.contactName ?? undefined,
        email: lead.email ?? undefined,
        phone: lead.phone ?? undefined,
        industry: lead.category?.name ?? undefined,
        leadId: lead.id,
      });
      setToast("Converted to customer.");
      router.push(`/dashboard/customers`);
    } catch {
      setToast("Could not convert this lead - it may already be a customer.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!lead) return null;

  const hasPendingFollowUps = lead.followUps.some((f) => f.status === "pending");

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/dashboard/leads")}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Leads
      </button>

      {toast && (
        <div className="rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm">
          {toast}
          <button onClick={() => setToast(null)} className="ml-3 text-text-muted hover:text-text">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">{lead.businessName}</h1>
          <p className="text-sm text-text-muted">{lead.category?.name ?? "Uncategorized"} - {lead.city ?? "-"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={lead.priority === "Hot" ? "success" : lead.priority === "Warm" ? "warning" : "neutral"}>
            Score {lead.score}
          </Badge>
          {lead.status === "WON" && (
            <Button onClick={convertToCustomer} disabled={busy} size="sm" variant="outline" className="gap-2">
              <UserCheck className="h-3.5 w-3.5" />
              Convert to Customer
            </Button>
          )}
          <select
            value={lead.status}
            onChange={(e) => changeStatus(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="bracket-marker">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-text-muted" /> {lead.email ?? "Not Found"}</p>
            <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-text-muted" /> {lead.phone ?? "Not Found"}</p>
            <p className="flex items-center gap-2"><Globe className="h-3.5 w-3.5 text-text-muted" /> {lead.website ?? "Not Found"}</p>
            {lead.contactName && <p className="text-text-muted">Contact: {lead.contactName}</p>}
            <Button onClick={sendEmail} disabled={!lead.email || busy} size="sm" className="mt-2 w-full gap-2">
              <Send className="h-3.5 w-3.5" />
              Send Email
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="bracket-marker">Follow-ups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lead.followUps.length === 0 ? (
              <p className="text-sm text-text-muted">No sequence running.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {lead.followUps.map((f) => (
                  <li key={f.id} className="flex items-center justify-between">
                    <span>{f.label}</span>
                    <Badge variant={f.status === "pending" ? "warning" : f.status === "sent" ? "success" : "neutral"}>
                      {f.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            {hasPendingFollowUps ? (
              <Button onClick={stopFollowUps} size="sm" variant="outline" className="mt-2 w-full gap-2">
                <Square className="h-3.5 w-3.5" />
                Stop Sequence
              </Button>
            ) : (
              <Button onClick={startFollowUps} disabled={busy} size="sm" className="mt-2 w-full gap-2">
                <Play className="h-3.5 w-3.5" />
                Start Follow-up Sequence
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="bracket-marker">Emails Sent</CardTitle>
          </CardHeader>
          <CardContent>
            {lead.emailLogs.length === 0 ? (
              <p className="text-sm text-text-muted">No emails sent yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {lead.emailLogs.map((e) => (
                  <li key={e.id}>
                    <p className="font-medium">{e.subject}</p>
                    <p className="text-xs text-text-muted">{new Date(e.sentAt).toLocaleString()} - {e.status}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="bracket-marker">Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {lead.activities.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-text-muted">No activity recorded yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {lead.activities.map((a) => (
                  <li key={a.id} className="px-5 py-3">
                    <p className="text-sm">{a.message}</p>
                    <p className="mt-0.5 text-xs text-text-muted">{new Date(a.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="bracket-marker">Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={addNote} className="flex gap-2">
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note..."
                className="h-9 flex-1 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
              />
              <Button type="submit" size="sm">Add</Button>
            </form>
            {lead.notes.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-muted">No notes yet.</p>
            ) : (
              <ul className="space-y-2">
                {lead.notes.map((n) => (
                  <li key={n.id} className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
                    <p>{n.content}</p>
                    <p className="mt-1 text-xs text-text-muted">{new Date(n.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}