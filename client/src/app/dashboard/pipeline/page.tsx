"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Deal {
  id: string;
  name: string;
  value: number;
  stage: string;
  customer: { company: string } | null;
  lead: { businessName: string } | null;
  assignedTo: { name: string } | null;
}

interface Customer {
  id: string;
  company: string;
}

const stages = [
  { key: "NEW", label: "New" },
  { key: "QUALIFIED", label: "Qualified" },
  { key: "MEETING", label: "Meeting" },
  { key: "PROPOSAL", label: "Proposal" },
  { key: "NEGOTIATION", label: "Negotiation" },
  { key: "WON", label: "Won" },
];

const emptyForm = { name: "", customerId: "", value: "" };

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([api.get<Deal[]>("/deals"), api.get<Customer[]>("/customers")])
      .then(([d, c]) => {
        setDeals(d.data);
        setCustomers(c.data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function moveStage(id: string, stage: string) {
    setMovingId(id);
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, stage } : d)));
    try {
      await api.patch(`/deals/${id}/stage`, { stage });
    } finally {
      setMovingId(null);
    }
  }

  async function createDeal(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = Number(form.value);
    if (!form.name.trim() || !value || value <= 0) {
      setError("Deal name and a positive value are required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/deals", {
        name: form.name,
        customerId: form.customerId || undefined,
        value,
      });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch {
      setError("Could not create deal.");
    } finally {
      setSaving(false);
    }
  }

  const totalValue = deals.filter((d) => d.stage !== "LOST").reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">Sales Pipeline</h1>
          <p className="text-sm text-text-muted">
            {deals.length} deal{deals.length === 1 ? "" : "s"} - {money(totalValue)} in active pipeline
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Deal
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={createDeal} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Deal name"
                className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
              />
              <select
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
              >
                <option value="">No customer yet</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder="Value ($)"
                className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
              />
              <div className="flex gap-2 sm:col-span-3">
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create Deal"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
              {error && <p className="text-sm text-danger sm:col-span-3">{error}</p>}
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {stages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage.key);
            const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
            return (
              <div key={stage.key} className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-text-muted">{stage.label}</span>
                  <span className="text-xs text-text-muted">{stageDeals.length}</span>
                </div>
                <p className="px-1 font-data text-xs text-text-muted">{money(stageValue)}</p>
                <div className="flex flex-col gap-2">
                  {stageDeals.map((deal) => (
                    <Card key={deal.id}>
                      <CardContent className="p-3">
                        <p className="text-sm font-medium">{deal.name}</p>
                        <p className="mt-0.5 text-xs text-text-muted">
                          {deal.customer?.company ?? deal.lead?.businessName ?? "No customer"}
                        </p>
                        <p className="mt-1.5 font-data text-sm">{money(deal.value)}</p>
                        {stage.key !== "WON" && (
                          <select
                            disabled={movingId === deal.id}
                            value={deal.stage}
                            onChange={(e) => moveStage(deal.id, e.target.value)}
                            className="mt-2 h-7 w-full rounded-md border border-border bg-surface-2 px-2 text-xs outline-none"
                          >
                            {stages.map((s) => (
                              <option key={s.key} value={s.key}>
                                Move to {s.label}
                              </option>
                            ))}
                            <option value="LOST">Mark Lost</option>
                          </select>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {stageDeals.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-text-muted">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}