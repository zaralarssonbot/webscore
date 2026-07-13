import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/context/AuthContext";
import {
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
} from "@/lib/account/notification-service";
import type { AppNotification } from "@/lib/account/types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "nyss";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  return `${Math.floor(hrs / 24)} d`;
}

export default function NotificationsBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: count = 0 } = useQuery({
    queryKey: ["notif-count", user?.id],
    queryFn: unreadCount,
    enabled: !!user,
    refetchInterval: 60000,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["notif-list", user?.id],
    queryFn: () => listNotifications(20),
    enabled: !!user && open,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["notif-count"] });
    qc.invalidateQueries({ queryKey: ["notif-list"] });
  };

  const onItem = async (n: AppNotification) => {
    if (!n.read_at) {
      await markRead(n.id);
      invalidate();
    }
    const reportId = (n.data?.report_id as string) || undefined;
    const domainId = (n.data?.domain_id as string) || undefined;
    setOpen(false);
    if (reportId) navigate(`/analys/${reportId}`);
    else if (domainId) navigate(`/app/domains/${domainId}`);
  };

  const onMarkAll = async () => {
    if (user) await markAllRead(user.id);
    invalidate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Aviseringar"
          className="relative w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
        >
          <Bell className="w-5 h-5" />
          {count > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-neon-cyan text-[10px] font-bold text-background flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">Aviseringar</span>
          {count > 0 && (
            <button
              type="button"
              onClick={onMarkAll}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Markera alla lästa
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Inga aviseringar</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onItem(n)}
                className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-white/5 transition-colors ${
                  n.read_at ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{n.title}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">{timeAgo(n.created_at)}</span>
                </div>
                {n.body && <p className="mt-0.5 text-xs text-muted-foreground font-light">{n.body}</p>}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
