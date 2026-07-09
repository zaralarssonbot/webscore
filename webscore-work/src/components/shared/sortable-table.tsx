"use client";

import { useMemo, useState } from "react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

export type SortDir = "asc" | "desc";
export interface SortState {
  key: string;
  dir: SortDir;
}

/**
 * Headless, dependency-free table sorting. Callers pass an accessor map so any
 * column (string, number, date string) can be sorted. Stable for the list sizes
 * in this product.
 */
export function useSort<T>(
  rows: T[],
  accessors: Record<string, (row: T) => string | number>,
  initial?: SortState
) {
  const [sort, setSort] = useState<SortState | null>(initial ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const acc = accessors[sort.key];
    if (!acc) return rows;
    const out = [...rows].sort((a, b) => {
      const av = acc(a);
      const bv = acc(b);
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av).localeCompare(String(bv), "sv", { numeric: true });
    });
    return sort.dir === "asc" ? out : out.reverse();
    // accessors is intentionally treated as stable per render-set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);

  const toggle = (key: string) =>
    setSort((p) =>
      p?.key === key
        ? { key, dir: p.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );

  return { sorted, sort, toggle };
}

/** Clickable, sortable column header with an inline direction indicator. */
export function SortHead({
  label,
  sortKey,
  sort,
  onSort,
  className,
  align = "left",
}: {
  label: string;
  sortKey: string;
  sort: SortState | null;
  onSort: (key: string) => void;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  const active = sort?.key === sortKey;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "group/sort -mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 uppercase tracking-wider transition-colors hover:text-foreground",
          active && "text-foreground",
          align === "right" && "flex-row-reverse",
          align === "center" && "mx-auto"
        )}
      >
        {label}
        {active ? (
          sort!.dir === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ChevronsUpDown className="size-3 opacity-0 transition-opacity group-hover/sort:opacity-50" />
        )}
      </button>
    </TableHead>
  );
}
