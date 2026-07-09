"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSort, SortHead } from "@/components/shared/sortable-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { TimeEntryActions } from "@/components/work/time-entry-actions";
import { timeEntryStatus } from "@/lib/status";
import { formatDate, formatDuration, initials } from "@/lib/utils";
import { Clock3 } from "lucide-react";
import type { TimeEntryStatus } from "@/lib/types";

export interface TimeRow {
  id: string;
  userName: string;
  userColor: string;
  woId: string | null;
  woNumber: string | null;
  workType: string;
  date: string;
  minutes: number;
  status: TimeEntryStatus;
}

type Filter = "all" | "submitted" | "approved" | "rejected";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Alla" },
  { key: "submitted", label: "Väntar" },
  { key: "approved", label: "Godkända" },
  { key: "rejected", label: "Avvisade" },
];

function Duration({ row }: { row: TimeRow }) {
  return (
    <>{row.status === "running" ? "pågår" : formatDuration(row.minutes)}</>
  );
}

export function TimeEntriesClient({
  rows,
  canApprove,
}: {
  rows: TimeRow[];
  canApprove: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(
    () => ({
      all: rows.length,
      submitted: rows.filter((r) => r.status === "submitted").length,
      approved: rows.filter((r) => r.status === "approved").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
    }),
    [rows]
  );

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter]
  );

  const { sorted, sort, toggle } = useSort(filtered, {
    user: (r) => r.userName.toLowerCase(),
    wo: (r) => r.woNumber ?? "",
    date: (r) => r.date,
    minutes: (r) => r.minutes,
    status: (r) => timeEntryStatus[r.status].label,
  });

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.key} value={f.key}>
              {f.label}
              <span className="ml-1.5 rounded-full bg-foreground/8 px-1.5 text-[11px] font-semibold tabular-nums">
                {counts[f.key]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Clock3 className="size-5" />
          </span>
          <p className="mt-1 text-sm font-medium">Inga tidsposter här</p>
          <p className="text-xs text-muted-foreground">
            Det finns inga poster i den här vyn just nu.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="space-y-2.5 md:hidden">
            {sorted.map((e) => (
              <div key={e.id} className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: e.userColor }}
                  >
                    {initials(e.userName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.userName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {e.woNumber ? `${e.woNumber} · ` : ""}
                      {e.workType} · {formatDate(e.date)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    <Duration row={e} />
                  </span>
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <StatusBadge meta={timeEntryStatus[e.status]} />
                  {canApprove && e.status === "submitted" && (
                    <TimeEntryActions entryId={e.id} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHead label="Medarbetare" sortKey="user" sort={sort} onSort={toggle} />
                  <SortHead label="Arbetsorder" sortKey="wo" sort={sort} onSort={toggle} />
                  <SortHead label="Datum" sortKey="date" sort={sort} onSort={toggle} />
                  <SortHead label="Tid" sortKey="minutes" sort={sort} onSort={toggle} className="text-right" align="right" />
                  <SortHead label="Status" sortKey="status" sort={sort} onSort={toggle} />
                  {canApprove && <th className="w-px" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span
                          className="flex size-9 items-center justify-center rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: e.userColor }}
                        >
                          {initials(e.userName)}
                        </span>
                        <span className="text-sm">{e.userName}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {e.woId ? (
                        <Link href={`/work-orders/${e.woId}`} className="hover:underline">
                          {e.woNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                      <span className="block text-xs text-muted-foreground">
                        {e.workType}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(e.date)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      <Duration row={e} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge meta={timeEntryStatus[e.status]} />
                    </TableCell>
                    {canApprove && (
                      <TableCell className="text-right">
                        {e.status === "submitted" && (
                          <TimeEntryActions entryId={e.id} />
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
