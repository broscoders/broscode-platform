"use client";

import { useEffect, useState } from "react";
import { Loader2, FolderKanban } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface Project {
  id: string;
  name: string;
  status: string;
  progress: number;
  budget: number | null;
  deadline: string | null;
  customer: { company: string } | null;
  manager: { name: string } | null;
  members: { user: { name: string; role: string } }[];
}

const statusVariant: Record<string, "default" | "success" | "warning" | "neutral" | "danger"> = {
  PLANNING: "neutral",
  ACTIVE: "default",
  REVIEW: "warning",
  ON_HOLD: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Project[]>("/projects")
      .then((res) => setProjects(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">Projects</h1>
        <p className="text-sm text-text-muted">{projects.length} project{projects.length === 1 ? "" : "s"} - created when an order is won.</p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
            <FolderKanban className="h-8 w-8 text-text-muted" />
            <p className="text-sm text-text-muted">No projects yet - they are created automatically from won orders.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{p.name}</p>
                  <Badge variant={statusVariant[p.status] ?? "neutral"}>{p.status.replace("_", " ")}</Badge>
                </div>
                <p className="mt-1 text-xs text-text-muted">{p.customer?.company ?? "No customer"}</p>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>Progress</span>
                    <span>{p.progress}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${p.progress}%` }} />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {p.members.slice(0, 4).map((m, i) => (
                    <span key={i} className="rounded-md bg-surface-2 px-2 py-0.5 text-xs text-text-muted">
                      {m.user.name}
                    </span>
                  ))}
                  {p.members.length === 0 && <span className="text-xs text-text-muted">No team assigned</span>}
                </div>

                {p.deadline && (
                  <p className="mt-3 text-xs text-text-muted">
                    Due {new Date(p.deadline).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}