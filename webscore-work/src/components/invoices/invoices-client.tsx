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
import { invoiceDraftStatus } from "@/lib/status";
import { formatSEK, formatDate } from "@/lib/utils";
import { Receipt } from "lucide-react";
import type { InvoiceDraftStatus } from "@/lib/types";

export interface InvoiceRow {
  id: string;
  number: string;
  customerName: string;
  projectName: string | null;
  reference: string;
  createdAt: string;
  total: number;
  status: InvoiceDraftStatus;
}

type Filter = "all" | InvoiceDraftStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Alla" },
  { key: "draft", label: "Utkast" },
  { key: "approved", label: "Godkända" },
  { key: "exported", label: "Överförda" },
];

export function InvoicesClient({ rows }: { rows: InvoiceRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(
    () => ({
      all: rows.length,
      draft: rows.filter((r) => r.status === "draft").length,
      approved: rows.filter((r) => r.status === "approved").length,
      exported: rows.filter((r) => r.status === "exported").length,
    }),
    [rows]
  );

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter]
  );

  const { sorted, sort, toggle } = useSort(
    filtered,
    {
      number: (r) => r.number,
      customer: (r) => r.customerName.toLowerCase(),
      reference: (r) => r.reference.toLowerCase(),
      createdAt: (r) => r.createdAt,
      total: (r) => r.total,
      status: (r) => invoiceDraftStatus[r.status].label,
    },
    { key: "createdAt", dir: "desc" }
  );

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
            <Receipt className="size-5" />
          </span>
          <p className="mt-1 text-sm font-medium">Inga underlag här</p>
          <p className="text-xs text-muted-foreground">
            Det finns inga underlag i den här vyn just nu.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="space-y-2.5 md:hidden">
            {sorted.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="block rounded-xl border border-border bg-card p-3.5 shadow-xs transition-transform active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{inv.number}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {inv.customerName}
                      {inv.projectName ? ` · ${inv.projectName}` : ""}
                    </p>
                  </div>
                  <StatusBadge meta={invoiceDraftStatus[inv.status]} />
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-base font-semibold tabular-nums">
                    {formatSEK(inv.total)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(inv.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHead label="Nummer" sortKey="number" sort={sort} onSort={toggle} />
                  <SortHead label="Kund" sortKey="customer" sort={sort} onSort={toggle} />
                  <SortHead label="Referens" sortKey="reference" sort={sort} onSort={toggle} />
                  <SortHead label="Datum" sortKey="createdAt" sort={sort} onSort={toggle} />
                  <SortHead label="Belopp" sortKey="total" sort={sort} onSort={toggle} className="text-right" align="right" />
                  <SortHead label="Status" sortKey="status" sort={sort} onSort={toggle} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link href={`/invoices/${inv.id}`} className="font-medium hover:underline">
                        {inv.number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {inv.customerName}
                      {inv.projectName && (
                        <span className="block text-xs text-muted-foreground">
                          {inv.projectName}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inv.reference}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(inv.createdAt)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatSEK(inv.total)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge meta={invoiceDraftStatus[inv.status]} />
                    </TableCell>
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
