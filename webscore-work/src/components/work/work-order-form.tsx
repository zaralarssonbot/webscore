"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveWorkOrder } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/shared/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { priorityMeta } from "@/lib/status";
import { initials } from "@/lib/utils";
import type { Priority, WorkOrder } from "@/lib/types";

interface Option {
  id: string;
  name: string;
  meta?: string;
  color?: string;
}

export function WorkOrderForm({
  workOrder,
  customers,
  projects,
  users,
  supervisors,
  defaults,
}: {
  workOrder?: WorkOrder;
  customers: Option[];
  projects: { id: string; name: string; customerId: string; address: string }[];
  users: Option[];
  supervisors: Option[];
  defaults?: { customerId?: string; projectId?: string };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [f, setF] = useState({
    title: workOrder?.title ?? "",
    customerId: workOrder?.customerId ?? defaults?.customerId ?? "",
    projectId: workOrder?.projectId ?? defaults?.projectId ?? "",
    address: workOrder?.address ?? "",
    description: workOrder?.description ?? "",
    instructions: workOrder?.instructions ?? "",
    supervisorId: workOrder?.supervisorId ?? supervisors[0]?.id ?? "",
    date: workOrder?.date?.slice(0, 10) ?? "",
    startTime: workOrder?.startTime ?? "08:00",
    estimatedEndTime: workOrder?.estimatedEndTime ?? "16:00",
    priority: (workOrder?.priority ?? "normal") as Priority,
  });
  const [assignees, setAssignees] = useState<string[]>(
    workOrder?.assigneeIds ?? []
  );

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const toggleAssignee = (id: string) =>
    setAssignees((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const pickProject = (pid: string) => {
    const proj = projects.find((p) => p.id === pid);
    setF((p) => ({
      ...p,
      projectId: pid,
      customerId: proj?.customerId ?? p.customerId,
      address: proj?.address || p.address,
    }));
  };

  const submit = () =>
    start(async () => {
      if (f.title.trim().length < 2) {
        toast.error("Ange en titel");
        return;
      }
      if (!f.customerId) {
        toast.error("Välj en kund");
        return;
      }
      const res = await saveWorkOrder({
        id: workOrder?.id,
        ...f,
        projectId: f.projectId || undefined,
        date: f.date || undefined,
        assigneeIds: assignees,
      });
      if (res.ok && res.id) {
        toast.success(workOrder ? "Arbetsorder uppdaterad" : "Arbetsorder skapad");
        router.push(`/work-orders/${res.id}`);
        router.refresh();
      } else if (!res.ok) toast.error(res.error);
    });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Uppgifter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Titel" required>
              <Input
                value={f.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="t.ex. Målning vardagsrum"
                autoFocus
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Projekt" hint="valfritt">
                <Select value={f.projectId || "none"} onValueChange={(v) => pickProject(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Inget projekt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Inget projekt</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Kund" required>
                <Select
                  value={f.customerId}
                  onValueChange={(v) => set("customerId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj kund" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Adress">
              <Input
                value={f.address}
                onChange={(e) => set("address", e.target.value)}
                autoComplete="street-address"
              />
            </Field>
            <Field label="Arbetsbeskrivning">
              <Textarea
                value={f.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
            <Field label="Instruktioner" hint="syns för montören">
              <Textarea
                value={f.instructions}
                onChange={(e) => set("instructions", e.target.value)}
                placeholder="t.ex. portkod, nyckel, färgkod…"
              />
            </Field>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Planering</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Datum">
              <Input
                type="date"
                value={f.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start">
                <Input
                  type="time"
                  value={f.startTime}
                  onChange={(e) => set("startTime", e.target.value)}
                />
              </Field>
              <Field label="Beräknat slut">
                <Input
                  type="time"
                  value={f.estimatedEndTime}
                  onChange={(e) => set("estimatedEndTime", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Prioritet">
              <Select
                value={f.priority}
                onValueChange={(v) => set("priority", v as Priority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(priorityMeta) as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {priorityMeta[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Arbetsledare">
              <Select
                value={f.supervisorId}
                onValueChange={(v) => set("supervisorId", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supervisors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tilldela personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {users.map((u) => (
              <label
                key={u.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50"
              >
                <Checkbox
                  checked={assignees.includes(u.id)}
                  onCheckedChange={() => toggleAssignee(u.id)}
                />
                <span
                  className="flex size-7 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: u.color }}
                >
                  {initials(u.name)}
                </span>
                <span className="text-sm">
                  {u.name}
                  {u.meta && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      · {u.meta}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </CardContent>
        </Card>

        <Button className="w-full" onClick={submit} disabled={pending} size="lg">
          {workOrder ? "Spara ändringar" : "Skapa arbetsorder"}
        </Button>
      </div>
    </div>
  );
}
