import {
  LayoutDashboard,
  Inbox,
  Users,
  FileText,
  FolderKanban,
  ClipboardList,
  Calendar,
  Clock,
  Package,
  Receipt,
  BarChart3,
  UserCog,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: Role[]; // visible to these roles (undefined = all)
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    items: [
      { label: "Översikt", href: "/dashboard", icon: LayoutDashboard },
      {
        label: "Mitt arbete",
        href: "/my-work",
        icon: ClipboardList,
        roles: ["worker", "supervisor"],
      },
    ],
  },
  {
    label: "Försäljning",
    items: [
      {
        label: "Förfrågningar",
        href: "/inquiries",
        icon: Inbox,
        roles: ["admin", "supervisor"],
      },
      {
        label: "Kunder",
        href: "/customers",
        icon: Users,
        roles: ["admin", "supervisor"],
      },
      {
        label: "Offerter",
        href: "/quotes",
        icon: FileText,
        roles: ["admin", "supervisor"],
      },
    ],
  },
  {
    label: "Leverans",
    items: [
      {
        label: "Projekt",
        href: "/projects",
        icon: FolderKanban,
        roles: ["admin", "supervisor"],
      },
      {
        label: "Arbetsorder",
        href: "/work-orders",
        icon: ClipboardList,
        roles: ["admin", "supervisor"],
      },
      { label: "Kalender", href: "/calendar", icon: Calendar },
      {
        label: "Tidrapporter",
        href: "/time",
        icon: Clock,
        roles: ["admin", "supervisor"],
      },
      {
        label: "Material",
        href: "/materials",
        icon: Package,
        roles: ["admin", "supervisor"],
      },
    ],
  },
  {
    label: "Ekonomi & uppföljning",
    items: [
      {
        label: "Fakturaunderlag",
        href: "/invoices",
        icon: Receipt,
        roles: ["admin", "supervisor"],
      },
      {
        label: "Rapporter",
        href: "/reports",
        icon: BarChart3,
        roles: ["admin", "supervisor"],
      },
    ],
  },
  {
    label: "Inställningar",
    items: [
      {
        label: "Team",
        href: "/team",
        icon: UserCog,
        roles: ["admin"],
      },
      {
        label: "Inställningar",
        href: "/settings",
        icon: Settings,
        roles: ["admin"],
      },
    ],
  },
];

export function visibleGroups(role: Role): NavGroup[] {
  return navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !i.roles || i.roles.includes(role)),
    }))
    .filter((g) => g.items.length > 0);
}

/** Flat list used by the mobile bottom bar (max 5). */
export function primaryMobileItems(role: Role): NavItem[] {
  const all = visibleGroups(role).flatMap((g) => g.items);
  const preferred =
    role === "worker"
      ? ["/my-work", "/calendar"]
      : ["/dashboard", "/quotes", "/work-orders", "/calendar", "/customers"];
  const picked = preferred
    .map((href) => all.find((i) => i.href === href))
    .filter((i): i is NavItem => Boolean(i));
  return picked.slice(0, 5);
}
