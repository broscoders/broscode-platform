"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  status: string;
  commissionRate: number;
  commissionType: string;
  wonDeals: number;
  totalCommission: number;
  _count: { assignedLeads: number; assignedDeals: number; projectsManaged: number };
}

const roles = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES", "DEVELOPER", "DESIGNER", "MARKETER"];

const emptyForm = { name: "", email: "", password: "", role: "SALES", commissionRate: 0 };

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .get<Member[]>("/team")
      .then((res) => setMembers(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      setError("Name, email, and an 8+ character password are required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/team", form);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Could not add team member.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-text-muted">{members.length} member{members.length === 1 ? "" : "s"}.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={addMember} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
                className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
              />
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email"
                className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
              />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Temporary password"
                className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
              />
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r.replace("_", " ")}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                max={100}
                value={form.commissionRate}
                onChange={(e) => setForm({ ...form, commissionRate: Number(e.target.value) })}
                placeholder="Commission %"
                className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
              />
              <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
                <Button type="submit" disabled={saving}>
                  {saving ? "Adding..." : "Add Member"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
              {error && <p className="text-sm text-danger sm:col-span-2 lg:col-span-5">{error}</p>}
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Leads</th>
                    <th className="px-5 py-3 font-medium">Won Deals</th>
                    <th className="px-5 py-3 font-medium">Commission</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-t border-border hover:bg-surface-2">
                      <td className="px-5 py-3">
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs text-text-muted">{m.email}</p>
                      </td>
                      <td className="px-5 py-3 text-text-muted">{m.role.replace("_", " ")}</td>
                      <td className="px-5 py-3">{m._count.assignedLeads}</td>
                      <td className="px-5 py-3">{m.wonDeals}</td>
                      <td className="px-5 py-3 font-data">{money(m.totalCommission)}</td>
                      <td className="px-5 py-3">
                        <Badge variant={m.status === "active" ? "success" : "neutral"}>{m.status}</Badge>
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