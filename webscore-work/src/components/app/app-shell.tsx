"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";
import {
  visibleGroups,
  primaryMobileItems,
  type NavGroup,
} from "./nav-config";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "./theme-toggle";
import { NotificationDropdown, type NotifItem } from "./notification-dropdown";
import { UserMenu } from "./user-menu";
import { GlobalSearch } from "./global-search";
import { WebscoreMark } from "./logo";
import { PanelLeftClose, PanelLeft, Menu, X } from "lucide-react";

interface ShellUser {
  id: string;
  name: string;
  title: string;
  email: string;
  role: Role;
  color: string;
}

export function AppShell({
  user,
  org,
  notifications,
  children,
}: {
  user: ShellUser;
  org: { name: string; logoText: string };
  notifications: NotifItem[];
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const groups = visibleGroups(user.role);
  const mobileItems = primaryMobileItems(user.role);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        <div className="sidebar-sheen" aria-hidden />
        <div
          className={cn(
            "relative z-10 flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4",
            collapsed && "justify-center px-0"
          )}
        >
          <SidebarBrand collapsed={collapsed} orgName={org.name} />
        </div>
        <SidebarNav groups={groups} collapsed={collapsed} pathname={pathname} />
        <div className="relative z-10 border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "w-full text-sidebar-muted hover:bg-white/10 hover:text-white",
              collapsed && "px-0"
            )}
          >
            {collapsed ? (
              <PanelLeft className="size-4" />
            ) : (
              <>
                <PanelLeftClose className="size-4" /> Minimera
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-sidebar shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
              <SidebarBrand collapsed={false} orgName={org.name} />
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-sidebar-muted hover:bg-white/10 hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <SidebarNav
              groups={groups}
              collapsed={false}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-30 flex h-16 items-center gap-2 border-b px-4 backdrop-blur-xl transition-[box-shadow,background-color,border-color] duration-200 md:px-6",
            scrolled
              ? "border-border bg-background/85 shadow-sm"
              : "border-transparent bg-background/70"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="-ml-1.5 size-10 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Öppna meny"
          >
            <Menu className="size-5" />
          </Button>
          <div className="hidden flex-1 md:block">
            <GlobalSearch targets={groups.flatMap((g) => g.items)} />
          </div>
          <div className="flex flex-1 items-center justify-end gap-1.5 md:flex-none">
            <ThemeToggle />
            <NotificationDropdown notifications={notifications} />
            <UserMenu user={user} orgName={org.name} />
          </div>
        </header>

        <main className="flex-1 pb-24 md:pb-10">
          <div key={pathname} className="animate-fade-in">
            {children}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
          style={{
            gridTemplateColumns: `repeat(${Math.max(mobileItems.length, 1)}, minmax(0, 1fr))`,
          }}
        >
          {mobileItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 pb-2 pt-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {active && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
                )}
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.34,1.4,0.5,1)]",
                    active ? "scale-100 bg-accent" : "scale-90"
                  )}
                >
                  <item.icon className="size-5" />
                </span>
                <span className="max-w-full truncate px-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function SidebarNav({
  groups,
  collapsed,
  pathname,
  onNavigate,
}: {
  groups: NavGroup[];
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
  return (
    <ScrollArea className="relative z-10 flex-1 px-3 py-4">
      <nav className="space-y-6">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label && !collapsed && (
              <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-sidebar-muted">
                {group.label}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-[background-color,color] duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                        active
                          ? "bg-white/[0.1] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                          : "text-sidebar-foreground hover:bg-white/[0.07] hover:text-white",
                        collapsed && "justify-center px-0"
                      )}
                    >
                      {/* active rail */}
                      <span
                        className={cn(
                          "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[var(--brand-electric)] to-[var(--brand-violet)] transition-opacity duration-150",
                          active ? "opacity-100" : "opacity-0",
                          collapsed && "hidden"
                        )}
                      />
                      <item.icon
                        className={cn(
                          "size-[18px] shrink-0 transition-colors",
                          active
                            ? "text-white"
                            : "text-sidebar-muted group-hover:text-white"
                        )}
                      />
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </ScrollArea>
  );
}

function SidebarBrand({
  collapsed,
  orgName,
}: {
  collapsed: boolean;
  orgName: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-black/5">
        <WebscoreMark size={21} color="var(--brand)" trackOpacity={0.2} />
      </span>
      {!collapsed && (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-bold tracking-tight text-white">
              Webscore
            </span>
            <span className="rounded-md bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sidebar-accent-foreground">
              Work
            </span>
          </span>
          <span className="truncate text-[11px] text-sidebar-muted">
            {orgName}
          </span>
        </span>
      )}
    </span>
  );
}
