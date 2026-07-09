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
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSort, SortHead } from "@/components/shared/sortable-table";
import { quoteStatus, quoteStages } from "@/lib/status";
import { formatSEK, formatDate } from "@/lib/utils";
import type { QuoteStatus } from "@/lib/types";

export interface QuoteRow {
  id: string;
  number: string;
  title: string;
  customer: string;
  value: number;
  status: QuoteStatus;
  createdAt: string;
  validUntil: string;
}

export function QuotesClient({ quotes }: { quotes: QuoteRow[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return quotes;
    return quotes.filter((r) =>
      [r.number, r.title, r.customer].some((v) =>
        v.toLowerCase().includes(term)
      )
    );
  }, [quotes, q]);

  const { sorted, sort, toggle } = useSort(
    filtered,
    {
      title: (r) => r.title.toLowerCase(),
      customer: (r) => r.customer.toLowerCase(),
      value: (r) => r.value,
      validUntil: (r) => r.validUntil,
      status: (r) => quoteStatus[r.status].label,
    },
    { key: "value", dir: "desc" }
  );

  return (
    <Tabs defaultValue="pipeline" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="table">Tabell</TabsTrigger>
        </TabsList>
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Sök offert…"
          className="w-full sm:w-64"
        />
      </div>

      <TabsContent value="pipeline">
        <p className="mb-2 text-xs text-muted-foreground md:hidden">
          Svep i sidled för att se alla steg →
        </p>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
          {quoteStages.map((stage) => {
            const cards = filtered.filter((r) => r.status === stage);
            const sum = cards.reduce((s, c) => s + c.value, 0);
            return (
              <div key={stage} className="w-72 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <StatusBadge meta={quoteStatus[stage]} />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {cards.length} · {formatSEK(sum)}
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
                      href={`/quotes/${r.id}`}
                      className="block rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <p className="text-sm font-medium leading-snug">
                        {r.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {r.number} · {r.customer}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatSEK(r.value)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(r.validUntil)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </TabsContent>

      <TabsContent value="table">
        {/* Mobile: stacked cards */}
        <div className="space-y-2.5 md:hidden">
          {filtered.map((r) => (
            <Link
              key={r.id}
              href={`/quotes/${r.id}`}
              className="block rounded-xl border border-border bg-card p-3.5 shadow-xs transition-transform active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.number} · {r.customer}
                  </p>
                </div>
                <StatusBadge meta={quoteStatus[r.status]} />
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-base font-semibold tabular-nums">
                  {formatSEK(r.value)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Giltig {formatDate(r.validUntil)}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden rounded-xl border border-border bg-card md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead label="Offert" sortKey="title" sort={sort} onSort={toggle} />
                <SortHead label="Kund" sortKey="customer" sort={sort} onSort={toggle} />
                <SortHead label="Värde" sortKey="value" sort={sort} onSort={toggle} className="text-right" align="right" />
                <SortHead label="Giltig till" sortKey="validUntil" sort={sort} onSort={toggle} />
                <SortHead label="Status" sortKey="status" sort={sort} onSort={toggle} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={`/quotes/${r.id}`} className="block">
                      <span className="font-medium">{r.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {r.number}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{r.customer}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatSEK(r.value)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(r.validUntil)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge meta={quoteStatus[r.status]} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}

