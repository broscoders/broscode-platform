"use client";

import { useEffect, useState } from "react";
import { Loader2, CalendarClock, Handshake, Bell, FolderKanban, CheckSquare, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface CalendarEvent {
  id: string;
  type: "deal_closing" | "follow_up" | "project_deadline" | "task_deadline" | "payment_due";
  title: string;
  date: string;
}

const typeMeta: Record<CalendarEvent["type"], { icon: typeof Handshake; label: string; variant: "default" | "success" | "warning" | "neutral" | "danger" }> = {
  deal_closing: { icon: Handshake, label: "Deal Closing", variant: "default" },
  follow_up: { icon: Bell, label: "Follow-up", variant: "warning" },
  project_deadline: { icon: FolderKanban, label: "Project Deadline", variant: "danger" },
  task_deadline: { icon: CheckSquare, label: "Task Deadline", variant: "neutral" },
  payment_due: { icon: Receipt, label: "Payment Due", variant: "warning" },
};

function groupByDay(events: CalendarEvent[]) {
  const groups = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = new Date(e.date).toDateString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  return groups;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<CalendarEvent[]>("/calendar")
      .then((res) => setEvents(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  const groups = groupByDay(events);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-text-muted">Upcoming deal closings, follow-ups, deadlines, and payments - from real records.</p>
      </div>

      {groups.size === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
            <CalendarClock className="h-8 w-8 text-text-muted" />
            <p className="text-sm text-text-muted">Nothing scheduled yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Array.from(groups.entries()).map(([day, dayEvents]) => (
            <Card key={day}>
              <CardContent className="p-4">
                <p className="mb-3 font-data text-xs font-medium uppercase tracking-wide text-text-muted">
                  {new Date(day).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                </p>
                <div className="space-y-2">
                  {dayEvents.map((e) => {
                    const meta = typeMeta[e.type];
                    const Icon = meta.icon;
                    return (
                      <div key={e.id} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
                        <div className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4 text-text-muted" />
                          <span className="text-sm">{e.title}</span>
                        </div>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}