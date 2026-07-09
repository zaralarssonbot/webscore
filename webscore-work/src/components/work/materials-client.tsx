"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchInput } from "@/components/shared/search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSort, SortHead } from "@/components/shared/sortable-table";
import { formatSEK, formatDate } from "@/lib/utils";
import { Package, Receipt } from "lucide-react";

export interface MaterialRow {
  id: string;
  name: string;
  supplier: string | null;
  articleNumber: string | null;
  createdAt: string;
  createdByName: string;
  woId: string | null;
  woNumber: string | null;
  customerName: string | null;
  quantity: number;
  unit: string;
  linePurchase: number;
  lineRevenue: number;
  margin: number;
  receiptUrl: string | null;
}

function ReceiptChip({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 rounded-full bg-status-cyan-bg px-1.5 py-0.5 text-[10px] font-medium text-status-cyan-fg ring-1 ring-status-cyan-fg/15 hover:underline"
    >
      <Receipt className="size-3" /> Kvitto
    </a>
  );
}

function Margin({ value }: { value: number }) {
  return (
    <span
      className={
        value >= 0 ? "text-status-green-fg" : "text-destructive"
      }
    >
      {formatSEK(value)}
    </span>
  );
}

export function MaterialsClient({ rows }: { rows: MaterialRow[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.name, r.supplier, r.articleNumber, r.woNumber, r.customerName]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(term))
    );
  }, [rows, q]);

  const { sorted, sort, toggle } = useSort(filtered, {
    name: (r) => r.name.toLowerCase(),
    wo: (r) => r.woNumber ?? "",
    quantity: (r) => r.quantity,
    purchase: (r) => r.linePurchase,
    revenue: (r) => r.lineRevenue,
    margin: (r) => r.margin,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground tabular-nums">
          {filtered.length} {filtered.length === 1 ? "rad" : "rader"}
        </p>
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Sök material, leverantör, AO…"
          className="w-full sm:w-72"
        />
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Package className="size-5" />
          </span>
          <p className="mt-1 text-sm font-medium">Inget material matchar</p>
          <p className="text-xs text-muted-foreground">
            Justera sökningen för att se fler rader.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="space-y-2.5 md:hidden">
            {sorted.map((m) => (
              <div key={m.id} className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.quantity} {m.unit}
                      {m.supplier ? ` · ${m.supplier}` : ""}
                      {m.woNumber ? ` · ${m.woNumber}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-right text-sm font-semibold tabular-nums">
                    {formatSEK(m.lineRevenue)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="tabular-nums">Inköp {formatSEK(m.linePurchase)}</span>
                  <span className="font-medium tabular-nums">
                    Marginal <Margin value={m.margin} />
                  </span>
                  {m.receiptUrl && (
                    <span className="ml-auto">
                      <ReceiptChip url={m.receiptUrl} />
                    </span>
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
                  <SortHead label="Material" sortKey="name" sort={sort} onSort={toggle} />
                  <SortHead label="Arbetsorder" sortKey="wo" sort={sort} onSort={toggle} />
                  <SortHead label="Antal" sortKey="quantity" sort={sort} onSort={toggle} className="text-right" align="right" />
                  <SortHead label="Inköp" sortKey="purchase" sort={sort} onSort={toggle} className="text-right" align="right" />
                  <SortHead label="Kundpris" sortKey="revenue" sort={sort} onSort={toggle} className="text-right" align="right" />
                  <SortHead label="Marginal" sortKey="margin" sort={sort} onSort={toggle} className="text-right" align="right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{m.name}</span>
                        {m.receiptUrl && <ReceiptChip url={m.receiptUrl} />}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {m.supplier ?? "—"}
                        {m.articleNumber ? ` · ${m.articleNumber}` : ""} ·{" "}
                        {formatDate(m.createdAt)} · {m.createdByName}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {m.woId ? (
                        <Link href={`/work-orders/${m.woId}`} className="hover:underline">
                          {m.woNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                      <span className="block text-xs text-muted-foreground">
                        {m.customerName ?? ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {m.quantity} {m.unit}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatSEK(m.linePurchase)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatSEK(m.lineRevenue)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      <Margin value={m.margin} />
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
