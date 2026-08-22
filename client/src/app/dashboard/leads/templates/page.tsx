"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, Copy, Trash2, Eye, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Category {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: string;
  category: { name: string } | null;
}

const emptyForm = { name: "", categoryId: "", subject: "", body: "" };
const sampleVars = {
  "{{business_name}}": "Al-Madina Restaurant",
  "{{contact_name}}": "Ahmed Khan",
  "{{city}}": "Lahore",
  "{{website}}": "al-madina.com",
  "{{industry}}": "Restaurant",
  "{{company_name}}": "Bro's Code",
};

function renderPreview(text: string) {
  let out = text;
  for (const [key, value] of Object.entries(sampleVars)) {
    out = out.split(key).join(value);
  }
  return out;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, c] = await Promise.all([
        api.get<Template[]>("/templates"),
        api.get<Category[]>("/categories"),
      ]);
      setTemplates(t.data);
      setCategories(c.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(t: Template) {
    setEditingId(t.id);
    setForm({ name: t.name, categoryId: "", subject: t.subject, body: t.body });
    setShowForm(true);
  }

  async function saveTemplate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      setError("Name, subject and body are required.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/templates/${editingId}`, {
          name: form.name,
          subject: form.subject,
          body: form.body,
          categoryId: form.categoryId || undefined,
        });
      } else {
        await api.post("/templates", {
          name: form.name,
          subject: form.subject,
          body: form.body,
          categoryId: form.categoryId || undefined,
        });
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      load();
    } catch {
      setError("Could not save template.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(id: string, current: string) {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: current === "active" ? "inactive" : "active" } : t))
    );
    await api.patch(`/templates/${id}/status`, { status: current === "active" ? "inactive" : "active" });
  }

  async function duplicate(id: string) {
    await api.post(`/templates/${id}/duplicate`);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    await api.delete(`/templates/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">Email Templates</h1>
          <p className="text-sm text-text-muted">One active template per category - auto-selected when you send.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={saveTemplate} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-muted">Template Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Restaurant Outreach"
                    className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-muted">Category</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
                  >
                    <option value="">No category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">Subject</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Quick question about {{business_name}}"
                  className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">
                  Body - use {"{{business_name}}"}, {"{{contact_name}}"}, {"{{city}}"}, {"{{website}}"}, {"{{industry}}"}, {"{{company_name}}"}
                </label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={6}
                  placeholder="Hi {{contact_name}}, I noticed {{business_name}} in {{city}}..."
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create Template"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
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
          ) : templates.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-text-muted">
              No templates yet - create one per category so sends are one-click.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Category</th>
                    <th className="px-5 py-3 font-medium">Subject</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.id} className="border-t border-border hover:bg-surface-2">
                      <td className="px-5 py-3 font-medium">{t.name}</td>
                      <td className="px-5 py-3 text-text-muted">{t.category?.name ?? "No category"}</td>
                      <td className="px-5 py-3 text-text-muted">{t.subject}</td>
                      <td className="px-5 py-3">
                        <button onClick={() => toggleStatus(t.id, t.status)}>
                          <Badge variant={t.status === "active" ? "success" : "neutral"}>{t.status}</Badge>
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setPreviewTemplate(t)} className="p-1.5 text-text-muted hover:text-primary" title="Preview">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => openEdit(t)} className="p-1.5 text-text-muted hover:text-primary" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => duplicate(t.id)} className="p-1.5 text-text-muted hover:text-primary" title="Duplicate">
                            <Copy className="h-4 w-4" />
                          </button>
                          <button onClick={() => remove(t.id)} className="p-1.5 text-text-muted hover:text-danger" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {previewTemplate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={() => setPreviewTemplate(null)}>
          <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-5">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">Preview (sample data)</p>
              <p className="mb-3 font-medium">{renderPreview(previewTemplate.subject)}</p>
              <div className="whitespace-pre-wrap rounded-lg bg-surface-2 p-4 text-sm">
                {renderPreview(previewTemplate.body)}
              </div>
              <Button className="mt-4" variant="outline" onClick={() => setPreviewTemplate(null)}>
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}