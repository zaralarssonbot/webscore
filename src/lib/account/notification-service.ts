import { supabase } from "@/integrations/supabase/client";
import type { AppNotification } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function listNotifications(limit = 30): Promise<AppNotification[]> {
  const { data, error } = await db
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[notification-service] list:", error);
    return [];
  }
  return (data ?? []) as AppNotification[];
}

export async function unreadCount(): Promise<number> {
  const { count, error } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) {
    console.error("[notification-service] unreadCount:", error);
    return 0;
  }
  return count ?? 0;
}

export async function markRead(id: string): Promise<void> {
  const { error } = await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  if (error) console.error("[notification-service] markRead:", error);
}

/** Mark all of the user's unread notifications as read. */
export async function markAllRead(userId: string): Promise<void> {
  const { error } = await db
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) console.error("[notification-service] markAllRead:", error);
}
