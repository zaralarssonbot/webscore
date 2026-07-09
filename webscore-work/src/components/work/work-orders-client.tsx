"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSort, SortHead } from "@/components/shared/sortable-table";
import { Badge } from "@/components/ui/badge";
import { workOrderStatus, workOrderStages, priorityMeta } from "@/lib/status";
import { formatDate, initials } from "@/lib/utils";
import { MapPin, Calendar } from "lucide-react";
import type { Priority, WorkOrderStatus } from "@/lib/types";

export interface WorkOrderRow {
  id: string;
  number: string;
  title: string;
  customer: string;
  address: string;
  date?: string;
  startTime?: string;
  status: WorkOrderStatus;
  priority: Priority;
  assignees: { name: string; color: string }[];
}

function Assignees({ list }: { list: { name: string; color: string }[] }) {
  return (
    <div className="flex -space-x-1.5">
      {list.slice(0, 3).map((a, i) => (
        <span
          key={i}
          title={a.name}
          className="flex size-7 items-center justify-center rounded-full border-2 border-card text-[10px] font-semibold text-white"
          style={{ backgroundColor: a.color }}
        >
          {initials(a.name)}
        </span>
      ))}
      {list.length === 0 && (
        <span className="text-xs text-muted-foreground">—</span>
      )}
    </div>
  );
}

export function WorkOrdersClient({ rows }: { rows: WorkOrderRow[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.number, r.title, r.customer, r.address].some((v) =>
        v.toLowerCase().includes(t)
      )
    );
  }, [rows, q]);

  const prioRank: Record<Priority, number> = {
    urgent: 3,
    high: 2,
    normal: 1,
    low: 0,
  };
  const { sorted, sort, toggle } = useSort(filtered, {
    title: (r) => r.title.toLowerCase(),
    customer: (r) => r.customer.toLowerCase(),
    date: (r) => r.date ?? "",
    priority: (r) => prioRank[r.priority],
    status: (r) => workOrderStatus[r.status].label,
  });

  return (
    <Tabs defaultValue="table" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList>
          <TabsTrigger value="table">Tabell</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Sök arbetsorder…"
            className="w-full sm:w-64"
          />
          <Link
            href="/calendar"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm shadow-sm hover:bg-muted"
          >
            <Calendar className="size-4" /> Kalender
          </Link>
        </div>
      </div>

      <TabsContent value="table">
        {/* Mobile: stacked cards */}
        <div className="space-y-2.5 md:hidden">
          {filtered.map((r) => (
            <Link
              key={r.id}
              href={`/work-orders/${r.id}`}
              className="block rounded-xl border border-border bg-card p-3.5 shadow-xs transition-transform active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {r.number}
                </span>
                <Badge variant={priorityMeta[r.priority].color}>
                  {priorityMeta[r.priority].label}
                </Badge>
              </div>
              <p className="mt-0.5 font-medium leading-snug">{r.title}</p>
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" /> {r.customer}
              </p>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {r.date ? formatDate(r.date) : "Ej planerad"}
                  {r.startTime ? ` · ${r.startTime}` : ""}
                </span>
                <div className="flex items-center gap-2">
                  <Assignees list={r.assignees} />
                  <StatusBadge meta={workOrderStatus[r.status]} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden rounded-xl border border-border bg-card md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead label="Arbetsorder" sortKey="title" sort={sort} onSort={toggle} />
                <SortHead label="Kund" sortKey="customer" sort={sort} onSort={toggle} />
                <SortHead label="Datum" sortKey="date" sort={sort} onSort={toggle} />
                <TableHead>Personal</TableHead>
                <SortHead label="Prioritet" sortKey="priority" sort={sort} onSort={toggle} />
                <SortHead label="Status" sortKey="status" sort={sort} onSort={toggle} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={`/work-orders/${r.id}`} className="block">
                      <span className="font-medium">{r.title}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {r.number} · <MapPin className="size-3" /> {r.address}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{r.customer}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.date ? (
                      <>
                        {formatDate(r.date)}
                        {r.startTime && (
                          <span className="block text-xs">{r.startTime}</span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Assignees list={r.assignees} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={priorityMeta[r.priority].color}>
                      {priorityMeta[r.priority].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge meta={workOrderStatus[r.status]} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="kanban">
        <p className="mb-2 text-xs text-muted-foreground md:hidden">
          Svep i sidled för att se alla steg →
        </p>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
          {workOrderStages.map((stage) => {
            const cards = filtered.filter((r) => r.status === stage);
            return (
              <div key={stage} className="w-72 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <StatusBadge meta={workOrderStatus[stage]} />
                  <span className="text-xs text-muted-foreground">
                    {cards.length}
                  </span>
                </div>
                <div className="space-y-2 rounded-xl bg-muted/40 p-2">
                  {cards.length === 0 && (
                    <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                      Tomt
                    </p>
                  )}
                  {cards.map((r) => (
                    <Link
                      key={r.id}
                      href={`/work-orders/${r.id}`}
                      className="block rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {r.number}
                        </span>
                        <Badge variant={priorityMeta[r.priority].color}>
                          {priorityMeta[r.priority].label}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm font-medium leading-snug">
                        {r.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.customer}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          {r.date ? formatDate(r.date) : "Ej planerad"}
                        </span>
                        <Assignees list={r.assignees} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </TabsContent>
    </Tabs>
  );
}
