"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { WorkOrderStatus } from "@/lib/types";
import { workOrderStatus, workOrderStages } from "@/lib/status";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface CalendarEvent {
  id: string;
  number: string;
  title: string;
  date: string; // yyyy-mm-dd
  startTime?: string;
  status: WorkOrderStatus;
  assigneeIds: string[];
  color: string;
}

export interface CalendarUser {
  id: string;
  name: string;
  color: string;
}

const WEEKDAYS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];
const MONTHS = [
  "Januari",
  "Februari",
  "Mars",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "Augusti",
  "September",
  "Oktober",
  "November",
  "December",
];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function CalendarBoard({
  events,
  users,
  initialYear,
  initialMonth,
}: {
  events: CalendarEvent[];
  users: CalendarUser[];
  initialYear: number;
  initialMonth: number;
}) {
  const [cursor, setCursor] = useState({ year: initialYear, month: initialMonth });
  const [assignee, setAssignee] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const today = ymd(new Date());

  const filtered = useMemo(
    () =>
      events.filter(
        (e) =>
          (assignee === "all" || e.assigneeIds.includes(assignee)) &&
          (status === "all" || e.status === status)
      ),
    [events, assignee, status]
  );

  // Build a 6-week grid starting on the Monday of the week containing the 1st.
  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const offset = (first.getDay() + 6) % 7; // Mon=0 … Sun=6
    const start = new Date(cursor.year, cursor.month, 1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const key = ymd(d);
      return {
        date: d,
        key,
        inMonth: d.getMonth() === cursor.month,
        events: filtered.filter((e) => e.date === key),
      };
    });
  }, [cursor, filtered]);

  function shift(delta: number) {
    setCursor((c) => {
      const m = c.month + delta;
      const year = c.year + Math.floor(m / 12);
      const month = ((m % 12) + 12) % 12;
      return { year, month };
    });
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => shift(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-44 text-center text-sm font-medium">
            {MONTHS[cursor.month]} {cursor.year}
          </span>
          <Button variant="outline" size="icon-sm" onClick={() => shift(1)}>
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setCursor({
                year: new Date().getFullYear(),
                month: new Date().getMonth(),
              })
            }
          >
            Idag
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue placeholder="Medarbetare" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla medarbetare</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla statusar</SelectItem>
              {workOrderStages.map((s) => (
                <SelectItem key={s} value={s}>
                  {workOrderStatus[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid — scrolls horizontally on small screens to stay usable */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card scrollbar-thin">
       <div className="min-w-[700px]">
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => (
            <div
              key={cell.key}
              className={[
                "min-h-24 border-b border-r border-border p-1.5 transition-colors",
                (i + 1) % 7 === 0 ? "border-r-0" : "",
                cell.key === today
                  ? "bg-accent/40"
                  : !cell.inMonth
                    ? "bg-muted/20"
                    : cell.date.getDay() === 0 || cell.date.getDay() === 6
                      ? "bg-muted/[0.12]"
                      : "",
              ].join(" ")}
            >
              <div className="mb-1 flex items-center justify-between px-0.5">
                <span
                  className={[
                    "text-xs",
                    cell.key === today
                      ? "flex size-5 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground"
                      : cell.inMonth
                        ? "text-foreground"
                        : "text-muted-foreground/60",
                  ].join(" ")}
                >
                  {cell.date.getDate()}
                </span>
              </div>
              <div className="space-y-1">
                {cell.events.map((e) => (
                  <Link
                    key={e.id}
                    href={`/work-orders/${e.id}`}
                    title={`${e.number} · ${e.title}`}
                    className="flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: e.color }}
                  >
                    {e.startTime && (
                      <span className="shrink-0 opacity-90">{e.startTime}</span>
                    )}
                    <span className="truncate">{e.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
       </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Medarbetare:</span>
        {users.map((u) => (
          <span key={u.id} className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: u.color }}
            />
            {u.name}
          </span>
        ))}
      </div>
    </div>
  );
}
