"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
}

interface ProjectDetail {
  id: string;
  name: string;
  status: string;
  budget: number | null;
  revenue: number | null;
  customer: { company: string } | null;
  manager: { name: string } | null;
  members: { user: { name: string; role: string } }[];
  tasks: Task[];
}

const statuses = ["PLANNING", "ACTIVE", "REVIEW", "ON_HOLD", "COMPLETED", "CANCELLED"];
const taskStatuses = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];

const statusVariant: Record<string, "default" | "success" | "warning" | "neutral" | "danger"> = {
  PLANNING: "neutral",
  ACTIVE: "default",
  REVIEW: "warning",
  ON_HOLD: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskTitle, setTaskTitle] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ProjectDetail>(`/projects/${params.id}`);
      setProject(res.data);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(status: string) {
    if (!project) return;
    setProject({ ...project, status });
    await api.patch(`/projects/${project.id}/status`, { status });
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!project || !taskTitle.trim()) return;
    await api.post(`/projects/${project.id}/tasks`, { title: taskTitle });
    setTaskTitle("");
    setShowTaskForm(false);
    load();
  }

  async function changeTaskStatus(taskId: string, status: string) {
    if (!project) return;
    setProject({ ...project, tasks: project.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)) });
    await api.patch(`/projects/tasks/${taskId}/status`, { status });
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!project) return null;

  const total = project.tasks.length;
  const done = project.tasks.filter((t) => t.status === "DONE").length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/dashboard/projects")}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">{project.name}</h1>
          <p className="text-sm text-text-muted">{project.customer?.company ?? "No customer"}</p>
        </div>
        <select
          value={project.status}
          onChange={(e) => changeStatus(e.target.value)}
          className="h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-muted">Budget</p>
            <p className="mt-1 font-data text-lg">{money(project.budget ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-muted">Progress</p>
            <p className="mt-1 font-data text-lg">{progress}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-muted">Status</p>
            <Badge variant={statusVariant[project.status] ?? "neutral"}>{project.status.replace("_", " ")}</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="bracket-marker">Tasks</CardTitle>
          <Button size="sm" onClick={() => setShowTaskForm((v) => !v)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {showTaskForm && (
            <form onSubmit={addTask} className="flex gap-2">
              <input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title"
                className="h-9 flex-1 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary"
              />
              <Button type="submit" size="sm">Add</Button>
            </form>
          )}
          {project.tasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">No tasks yet.</p>
          ) : (
            <ul className="space-y-2">
              {project.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
                  <span className="text-sm">{t.title}</span>
                  <select
                    value={t.status}
                    onChange={(e) => changeTaskStatus(t.id, e.target.value)}
                    className="h-7 rounded-md border border-border bg-surface px-2 text-xs outline-none"
                  >
                    {taskStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="bracket-marker">Team</CardTitle>
        </CardHeader>
        <CardContent>
          {project.members.length === 0 ? (
            <p className="text-sm text-text-muted">No team members assigned yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {project.members.map((m, i) => (
                <span key={i} className="rounded-lg bg-surface-2 px-3 py-1.5 text-sm">
                  {m.user.name} <span className="text-xs text-text-muted">- {m.user.role}</span>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}