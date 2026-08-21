"use client";

import { useEffect, useState } from "react";
import { Loader2, ShoppingCart, Plus, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  paymentStatus: string;
  customer: { company: string } | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    total: number;
    paidAmount: number;
    status: string;
    dueDate: string;
  } | null;
}

interface Customer {
  id: string;
  company: string;
}

interface OrderItemForm {
  service: string;
  quantity: string;
  unitPrice: string;
}

const statusVariant: Record<string, "default" | "success" | "warning" | "neutral" | "danger"> = {
  paid: "success",
  partial: "warning",
  pending: "neutral",
  overdue: "danger",
};

const emptyItem: OrderItemForm = { service: "", quantity: "1", unitPrice: "" };

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [dueDate, setDueDate] = useState(todayPlus(14));
  const [items, setItems] = useState<OrderItemForm[]>([{ ...emptyItem }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [paymentTargetInvoiceId, setPaymentTargetInvoiceId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  function load() {
    setLoading(true);
    Promise.all([api.get<Order[]>("/orders"), api.get<Customer[]>("/customers")])
      .then(([o, c]) => {
        setOrders(o.data);
        setCustomers(c.data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function updateItem(i: number, field: keyof OrderItemForm, value: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  function addItemRow() {
    setItems((prev) => [...prev, { ...emptyItem }]);
  }

  function removeItemRow(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  const previewTotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);

  async function createOrder(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const validItems = items
      .filter((it) => it.service.trim() && Number(it.unitPrice) > 0)
      .map((it) => ({ service: it.service, quantity: Number(it.quantity) || 1, unitPrice: Number(it.unitPrice) }));

    if (!customerId) {
      setError("Select a customer.");
      return;
    }
    if (validItems.length === 0) {
      setError("Add at least one service with a price.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/orders", { customerId, items: validItems, dueDate });
      setCustomerId("");
      setItems([{ ...emptyItem }]);
      setShowForm(false);
      load();
    } catch {
      setError("Could not create order.");
    } finally {
      setSaving(false);
    }
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentTargetInvoiceId) return;
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) return;
    await api.post(`/orders/invoices/${paymentTargetInvoiceId}/payments`, { amount });
    setPaymentTargetInvoiceId(null);
    setPaymentAmount("");
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">Orders & Invoices</h1>
          <p className="text-sm text-text-muted">{orders.length} order{orders.length === 1 ? "" : "s"}.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Order
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <form onSubmit={createOrder} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-text-muted">Services</p>
                {items.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={item.service}
                      onChange={(e) => updateItem(i, "service", e.target.value)}
                      placeholder="Service name"
                      className="h-9 flex-1 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
                    />
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(i, "quantity", e.target.value)}
                      placeholder="Qty"
                      className="h-9 w-20 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
                    />
                    <input
                      type="number"
                      min={0}
                      value={item.unitPrice}
                      onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
                      placeholder="Unit price"
                      className="h-9 w-32 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
                    />
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItemRow(i)} className="text-text-muted hover:text-danger">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addItemRow} className="text-xs text-primary hover:underline">
                  + Add another service
                </button>
              </div>

              <p className="text-sm text-text-muted">
                Total: <span className="font-data text-text">{money(previewTotal)}</span>
              </p>

              {error && <p className="text-sm text-danger">{error}</p>}

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create Order"}
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
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <ShoppingCart className="h-8 w-8 text-text-muted" />
              <p className="text-sm text-text-muted">No orders yet - create one for a customer above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-5 py-3 font-medium">Order #</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Invoice #</th>
                    <th className="px-5 py-3 font-medium">Total</th>
                    <th className="px-5 py-3 font-medium">Paid</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t border-border hover:bg-surface-2">
                      <td className="px-5 py-3 font-data">{o.orderNumber}</td>
                      <td className="px-5 py-3 font-medium">{o.customer?.company ?? "-"}</td>
                      <td className="px-5 py-3 font-data text-text-muted">{o.invoice?.invoiceNumber ?? "-"}</td>
                      <td className="px-5 py-3 font-data">{money(o.total)}</td>
                      <td className="px-5 py-3 font-data">{money(o.invoice?.paidAmount ?? 0)}</td>
                      <td className="px-5 py-3">
                        <Badge variant={statusVariant[o.invoice?.status ?? o.paymentStatus] ?? "neutral"}>
                          {o.invoice?.status ?? o.paymentStatus}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        {o.invoice && o.invoice.status !== "paid" && (
                          <Button size="sm" variant="outline" onClick={() => setPaymentTargetInvoiceId(o.invoice!.id)}>
                            Record Payment
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {paymentTargetInvoiceId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-5">
              <p className="mb-3 font-medium">Record Payment</p>
              <form onSubmit={recordPayment} className="space-y-3">
                <input
                  type="number"
                  min={0}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Amount received"
                  className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button type="submit">Save</Button>
                  <Button type="button" variant="outline" onClick={() => setPaymentTargetInvoiceId(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}