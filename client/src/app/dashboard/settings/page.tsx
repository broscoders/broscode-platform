"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, Archive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Category {
  id: string;
  name: string;
  archived: boolean;
  _count: { leads: number };
}

interface Expense {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: string;
  addedBy: { name: string } | null;
}

const expenseCategories = ["Marketing", "Software", "Hosting", "Salary", "Office", "Other"];

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState("");
  const [expenseForm, setExpenseForm] = useState({ name: "", category: "Marketing", amount: "" });
  const [savingExpense, setSavingExpense] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([api.get<Category[]>("/categories"), api.get<Expense[]>("/expenses")])
      .then(([c, e]) => {
        setCategories(c.data);
        setExpenses(e.data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    await api.post("/categories", { name: newCategory });
    setNewCategory("");
    load();
  }

  async function archiveCategory(id: string) {
    await api.patch(`/categories/${id}`, { archived: true });
    load();
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(expenseForm.amount);
    if (!expenseForm.name.trim() || !amount || amount <= 0) return;
    setSavingExpense(true);
    try {
      await api.post("/expenses", { name: expenseForm.name, category: expenseForm.category, amount });
      setExpenseForm({ name: "", category: "Marketing", amount: "" });
      load();
    } finally {
      setSavingExpense(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-text-muted">Manage lead categories and track business expenses.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="bracket-marker">Lead Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={addCategory} className="flex gap-2">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Real Estate"
                className="h-9 flex-1 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
              />
              <Button type="submit" size="icon" className="h-9 w-9">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
            <div className="space-y-1">
              {categories.length === 0 ? (
                <p className="py-4 text-center text-sm text-text-muted">No categories yet.</p>
              ) : (
                categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-surface-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{c.name}</span>
                      <Badge variant="neutral">{c._count.leads} leads</Badge>
                    </div>
                    <button
                      onClick={() => archiveCategory(c.id)}
                      className="text-text-muted transition-colors hover:text-danger"
                      title="Archive category"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="bracket-marker">Add Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addExpense} className="space-y-3">
              <input
                value={expenseForm.name}
                onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })}
                placeholder="Expense name"
                className="h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="h-9 flex-1 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
                >
                  {expenseCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="Amount"
                  className="h-9 w-28 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <Button type="submit" disabled={savingExpense} className="w-full">
                {savingExpense ? "Adding..." : "Add Expense"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="bracket-marker">Expense History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-text-muted">No expenses recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Category</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Added By</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="px-5 py-3 font-medium">{e.name}</td>
                      <td className="px-5 py-3 text-text-muted">{e.category}</td>
                      <td className="px-5 py-3 text-text-muted">{new Date(e.date).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-text-muted">{e.addedBy?.name ?? "-"}</td>
                      <td className="px-5 py-3 font-data">{money(e.amount)}</td>
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