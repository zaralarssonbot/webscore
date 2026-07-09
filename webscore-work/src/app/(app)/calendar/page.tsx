import { requireSession } from "@/lib/auth";
import { listWorkOrders, listUsers, getUser } from "@/lib/queries";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { CalendarBoard, type CalendarEvent } from "./calendar-board";

export default async function CalendarPage() {
  await requireSession();

  const events: CalendarEvent[] = listWorkOrders()
    .filter((w) => w.date)
    .map((w) => ({
      id: w.id,
      number: w.number,
      title: w.title,
      date: w.date!.slice(0, 10),
      startTime: w.startTime,
      status: w.status,
      assigneeIds: w.assigneeIds,
      color: getUser(w.assigneeIds[0])?.color ?? "#6b7280",
    }));

  const users = listUsers().map((u) => ({
    id: u.id,
    name: u.name,
    color: u.color,
  }));

  const now = new Date();

  return (
    <>
      <PageHeader
        title="Kalender"
        description="Schemalagda arbetsorder per dag. Filtrera på medarbetare eller status."
      />
      <PageBody>
        <CalendarBoard
          events={events}
          users={users}
          initialYear={now.getFullYear()}
          initialMonth={now.getMonth()}
        />
      </PageBody>
    </>
  );
}
