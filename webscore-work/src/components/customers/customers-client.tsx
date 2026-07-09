"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, User, Plus, Phone, Mail, ChevronRight } from "lucide-react";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSort, SortHead } from "@/components/shared/sortable-table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerForm } from "./customer-form";
import type { Customer } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface Row extends Customer {
  quoteCount: number;
  projectCount: number;
}

export function CustomersClient({ customers }: { customers: Row[] }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "private" | "company">("all");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return customers.filter((c) => {
      if (tab !== "all" && c.type !== tab) return false;
      if (!term) return true;
      return [c.name, c.companyName, c.email, c.phone, c.orgNumber]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(term));
    });
  }, [customers, q, tab]);

  const { sorted, sort, toggle } = useSort(filtered, {
    name: (c) => c.name.toLowerCase(),
    contact: (c) => (c.phone || c.email || "").toLowerCase(),
    quoteCount: (c) => c.quoteCount,
    projectCount: (c) => c.projectCount,
    createdAt: (c) => c.createdAt,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">Alla</TabsTrigger>
            <TabsTrigger value="private">Privatpersoner</TabsTrigger>
            <TabsTrigger value="company">Företag</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Sök kund…"
            className="w-full sm:w-64"
          />
          <CustomerForm
            trigger={
              <Button>
                <Plus className="size-4" /> Ny kund
              </Button>
            }
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={User}
          title="Inga kunder hittades"
          description="Justera sökningen eller lägg till en ny kund."
          action={
            <CustomerForm trigger={<Button><Plus className="size-4" /> Ny kund</Button>} />
          }
        />
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="space-y-2.5 md:hidden">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 shadow-xs transition-transform active:scale-[0.99]"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  {c.type === "company" ? (
                    <Building2 className="size-4" />
                  ) : (
                    <User className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.phone || c.email || "—"}
                  </p>
                  <div className="mt-1.5 flex gap-1.5">
                    <Badge variant="gray">{c.quoteCount} offerter</Badge>
                    <Badge variant="gray">{c.projectCount} projekt</Badge>
                  </div>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden rounded-xl border border-border bg-card md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead label="Kund" sortKey="name" sort={sort} onSort={toggle} />
                <SortHead label="Kontakt" sortKey="contact" sort={sort} onSort={toggle} />
                <SortHead label="Offerter" sortKey="quoteCount" sort={sort} onSort={toggle} className="text-center" align="center" />
                <SortHead label="Projekt" sortKey="projectCount" sort={sort} onSort={toggle} className="text-center" align="center" />
                <SortHead label="Tillagd" sortKey="createdAt" sort={sort} onSort={toggle} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((c) => (
                <TableRow key={c.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/customers/${c.id}`} className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                        {c.type === "company" ? (
                          <Building2 className="size-4" />
                        ) : (
                          <User className="size-4" />
                        )}
                      </span>
                      <span>
                        <span className="block font-medium">{c.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {c.type === "company"
                            ? c.companyName ?? "Företag"
                            : "Privatperson"}
                        </span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5 text-sm text-muted-foreground">
                      {c.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="size-3" /> {c.phone}
                        </span>
                      )}
                      {c.email && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="size-3" /> {c.email}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="gray">{c.quoteCount}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="gray">{c.projectCount}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(c.createdAt)}
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
