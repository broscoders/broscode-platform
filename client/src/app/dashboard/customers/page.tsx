"use client";

import { useEffect, useState } from "react";
import { Loader2, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

interface Customer {
  id: string;
  company: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  totalRevenue: number;
  outstanding: number;
  orderCount: number;
}

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Customer[]>("/customers")
      .then((res) => setCustomers(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-text-muted">{customers.length} customer{customers.length === 1 ? "" : "s"} - created when a lead or deal converts.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <Building2 className="h-8 w-8 text-text-muted" />
              <p className="text-sm text-text-muted">No customers yet - win a deal to create your first one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-5 py-3 font-medium">Company</th>
                    <th className="px-5 py-3 font-medium">Contact</th>
                    <th className="px-5 py-3 font-medium">Industry</th>
                    <th className="px-5 py-3 font-medium">Orders</th>
                    <th className="px-5 py-3 font-medium">Revenue</th>
                    <th className="px-5 py-3 font-medium">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-t border-border hover:bg-surface-2">
                      <td className="px-5 py-3 font-medium">{c.company}</td>
                      <td className="px-5 py-3 text-text-muted">{c.contactPerson ?? c.email ?? "-"}</td>
                      <td className="px-5 py-3 text-text-muted">{c.industry ?? "-"}</td>
                      <td className="px-5 py-3">{c.orderCount}</td>
                      <td className="px-5 py-3 font-data">{money(c.totalRevenue)}</td>
                      <td className="px-5 py-3 font-data text-warning">{c.outstanding > 0 ? money(c.outstanding) : "-"}</td>
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