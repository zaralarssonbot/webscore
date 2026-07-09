import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listNotifications } from "@/lib/queries";
import { AppShell } from "@/components/app/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { user, organization } = session;
  const notifications = listNotifications(user.id).slice(0, 12);

  return (
    <AppShell
      user={{
        id: user.id,
        name: user.name,
        title: user.title,
        email: user.email,
        role: user.role,
        color: user.color,
      }}
      org={{ name: organization.name, logoText: organization.logoText }}
      notifications={notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        href: n.href,
        read: n.read,
        createdAt: n.createdAt,
        kind: n.kind,
      }))}
    >
      {children}
    </AppShell>
  );
}
