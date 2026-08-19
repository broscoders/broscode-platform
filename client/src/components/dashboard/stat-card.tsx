import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
}

export function StatCard({ label, value, delta, trend = "neutral", icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
        <Icon className="h-4 w-4 text-text-muted" />
      </div>
      <p className="font-data mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {delta && (
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            trend === "up" && "text-success",
            trend === "down" && "text-danger",
            trend === "neutral" && "text-text-muted"
          )}
        >
          {delta}
        </p>
      )}
    </div>
  );
}
