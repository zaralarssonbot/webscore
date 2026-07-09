"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Bell, CheckCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions";
import { timeAgo, cn } from "@/lib/utils";
import type { NotificationKind } from "@/lib/types";

export interface NotifItem {
  id: string;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string;
  kind: NotificationKind;
}

export function NotificationDropdown({
  notifications,
}: {
  notifications: NotifItem[];
}) {
  const [, startTransition] = useTransition();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative" aria-label="Notiser">
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex size-2 items-center justify-center">
              <span className="absolute inline-flex size-2 animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-sm font-semibold">Notiser</span>
          {unread > 0 && (
            <button
              onClick={() =>
                startTransition(() => void markAllNotificationsRead())
              }
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="size-3.5" /> Markera alla lästa
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {notifications.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Inga notiser
            </p>
          )}
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={n.href ?? "#"}
              onClick={() =>
                startTransition(() => void markNotificationRead(n.id))
              }
              className={cn(
                "flex gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-muted/60",
                !n.read && "bg-accent/40"
              )}
            >
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  n.read ? "bg-transparent" : "bg-primary"
                )}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{n.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {n.body}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground/70">
                  {timeAgo(n.createdAt)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
