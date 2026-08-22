"use client";

import { useEffect, useState } from "react";
import { Loader2, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

interface AuditLogEntry {
  id: string;
  action: string;
  recordType: string | null;
  recordId: string | null;
  createdAt: string;
  user: { name: string } | null;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AuditLogEntry[]>("/audit")
      .then((res) => setLogs(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-sm text-text-muted">Record of important actions across the system.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <History className="h-8 w-8 text-text-muted" />
              <p className="text-sm text-text-muted">No actions logged yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-5 py-3 font-medium">Action</th>
                    <th className="px-5 py-3 font-medium">User</th>
                    <th className="px-5 py-3 font-medium">Record</th>
                    <th className="px-5 py-3 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="px-5 py-3">{l.action}</td>
                      <td className="px-5 py-3 text-text-muted">{l.user?.name ?? "System"}</td>
                      <td className="px-5 py-3 text-text-muted">{l.recordType ?? "-"}</td>
                      <td className="px-5 py-3 text-text-muted">{new Date(l.createdAt).toLocaleString()}</td>
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