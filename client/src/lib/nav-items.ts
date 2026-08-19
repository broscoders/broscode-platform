import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Radar,
  Users,
  KanbanSquare,
  Handshake,
  ShoppingCart,
  FolderKanban,
  UsersRound,
  Wallet,
  BarChart3,
  CalendarDays,
  Settings,
  Bot,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Leads",
    items: [
      { label: "AI Lead Finder", href: "/dashboard/leads/finder", icon: Radar },
      { label: "All Leads", href: "/dashboard/leads", icon: Users },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Pipeline", href: "/dashboard/pipeline", icon: KanbanSquare },
      { label: "Customers", href: "/dashboard/customers", icon: Handshake },
      { label: "Orders & Invoices", href: "/dashboard/orders", icon: ShoppingCart },
    ],
  },
  {
    label: "Delivery",
    items: [
      { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
      { label: "Team", href: "/dashboard/team", icon: UsersRound },
    ],
  },
  {
    label: "Finance",
    items: [{ label: "Revenue & Expenses", href: "/dashboard/finance", icon: Wallet }],
  },
  {
    label: "Insights",
    items: [
      { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
      { label: "AI Assistant", href: "/dashboard/assistant", icon: Bot },
      { label: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
    ],
  },
  {
    label: "System",
    items: [{ label: "Settings", href: "/dashboard/settings", icon: Settings }],
  },
];
