"use client";

import { useEffect, useState, useCallback } from "react";
import { DollarSign, Receipt, TrendingUp, Percent, Plus, Trash2, Loader2 } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Summary {
  totalRevenue: number;
  pendingPayments: number;
  totalExpenses: number;
  netProfit: number;
  totalCommission: number;
}

interface Expense {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
  addedBy: { name: string } | null;
}

const CATEGORIES = ["Marketing", "Software", "Hosting", "Salary", "Office", "Other"] as const;

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function FinancePage() {
  const { canManageFinance } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Other");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    const [summaryRes, expensesRes] = await Promise.all([
      api.get<Summary>("/dashboard/summary"),
      api.get<Expense[]>("/expenses"),
    ]);
    setSummary(summaryRes.data);
    setExpenses(expensesRes.data);
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!name.trim() || !parsedAmount || parsedAmount <= 0) {
      setError("Enter a name and a positive amount.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post("/expenses", { name, category, amount: parsedAmount, description: description || undefined });
      setName("");
      setAmount("");
      setDescription("");
      setCategory("Other");
      setShowForm(false);
      await load();
    } catch {
      setError("Couldn't save the expense. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/expenses/${id}`);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  const byCategory = CATEGORIES.map((cat) => ({
    category: cat,
    total: expenses.filter((e) => e.category === cat).reduce((sum, e) => sum + e.amount, 0),
  })).filter((c) => c.total > 0);
  const maxCategoryTotal = Math.max(1, ...byCategory.map((c) => c.total));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">Revenue &amp; Expenses</h1>
          <p className="text-sm text-text-muted">Real numbers only — revenue is actual payments received, nothing projected.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Expense
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard label="Revenue (Paid)" value={money(summary.totalRevenue)} icon={DollarSign} />
          <StatCard label="Pending Payments" value={money(summary.pendingPayments)} icon={Receipt} />
          <StatCard label="Total Expenses" value={money(summary.totalExpenses)} icon={Receipt} />
          <StatCard
            label="Net Profit"
            value={money(summary.netProfit)}
            trend={summary.netProfit >= 0 ? "up" : "down"}
            icon={TrendingUp}
          />
          <StatCard label="Commissions Owed" value={money(summary.totalCommission)} icon={Percent} />
        </div>
      )}

      {showForm && (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={handleAddExpense} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Domain renewal"
                  className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
                  className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">Amount ($) *</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50"
                  className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">Note</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional"
                  className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <Button type="submit" disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {saving ? "Saving..." : "Save Expense"}
                </Button>
              </div>
            </form>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          </CardContent>
        </Card>
      )}

      {byCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="bracket-marker">Expenses by category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {byCategory.map((c) => (
              <div key={c.category} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-text-muted">{c.category}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(c.total / maxCategoryTotal) * 100}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right font-data text-xs">{money(c.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="bracket-marker">All expenses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-5 py-8 text-center text-sm text-text-muted">Loading...</p>
          ) : expenses.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-text-muted">No expenses logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Category</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Added By</th>
                    {canManageFinance && <th className="px-5 py-3 font-medium" />}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="border-t border-border hover:bg-surface-2">
                      <td className="px-5 py-3 font-medium">
                        {exp.name}
                        {exp.description && <p className="text-xs font-normal text-text-muted">{exp.description}</p>}
                      </td>
                      <td className="px-5 py-3 text-text-muted">{exp.category}</td>
                      <td className="px-5 py-3 font-data">{money(exp.amount)}</td>
                      <td className="px-5 py-3 text-text-muted">{new Date(exp.date).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-text-muted">{exp.addedBy?.name ?? "—"}</td>
                      {canManageFinance && (
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="p-1.5 text-text-muted hover:text-danger"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
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
