import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getChangeOrderByToken } from "@/lib/queries";
import { store } from "@/lib/db/store";
import { PublicChangeOrderActions } from "@/components/work/public-change-order-actions";
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  BadgeCheck,
  Lock,
} from "lucide-react";
import { formatSEK, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Tilläggsarbete · Webscore Work" };

export default async function PublicChangeOrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const co = getChangeOrderByToken(token);
  if (!co) notFound();
  const org = store.organization;
  const decided = co.status === "approved" || co.status === "declined";
  const vat = co.price * 0.25;

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Branded header */}
      <header className="bg-brand-mesh text-white">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white text-sm font-bold tracking-tight text-[color:var(--brand)] shadow-sm ring-1 ring-black/5">
              {org.logoText}
            </span>
            <div className="leading-tight">
              <p className="text-[15px] font-bold tracking-tight">{org.name}</p>
              <p className="text-xs text-white/70">Tilläggsarbete</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/15">
            <Lock className="size-3.5" /> Säker länk
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-5 px-4 py-6 md:py-8">
        {decided && (
          <div
            className={`flex items-center gap-3 rounded-xl border p-4 ${
              co.status === "approved"
                ? "border-status-green-fg/25 bg-status-green-bg text-status-green-fg"
                : "border-status-red-fg/25 bg-status-red-bg text-status-red-fg"
            }`}
          >
            {co.status === "approved" ? (
              <CheckCircle2 className="size-5" />
            ) : (
              <XCircle className="size-5" />
            )}
            <p className="text-sm font-semibold">
              {co.status === "approved"
                ? "Tilläggsarbetet är godkänt. Tack!"
                : "Tilläggsarbetet är avböjt."}
            </p>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
          <div className="p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Förfrågan om tilläggsarbete
            </p>
            <h1 className="mt-1.5 text-xl font-bold tracking-tight">
              {co.description}
            </h1>
            {co.reason && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {co.reason}
              </p>
            )}

            <dl className="mt-5 space-y-2.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Beräknad tid</dt>
                <dd className="font-medium tabular-nums">
                  {co.estimatedHours} tim
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Pris exkl. moms</dt>
                <dd className="font-medium tabular-nums">
                  {formatSEK(co.price)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Moms (25%)</dt>
                <dd className="font-medium tabular-nums">{formatSEK(vat)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-accent px-4 py-3">
              <span className="text-sm font-semibold text-accent-foreground">
                Totalt inkl. moms
              </span>
              <span className="text-lg font-bold tabular-nums text-accent-foreground">
                {formatSEK(co.price + vat)}
              </span>
            </div>
          </div>

          {!decided && (
            <div className="border-t border-border bg-muted/30 p-6">
              <p className="mb-4 text-sm font-semibold">
                Vill du godkänna tilläggsarbetet?
              </p>
              <PublicChangeOrderActions token={token} />
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-status-green-fg" /> Säker
                  hantering
                </span>
                <span className="flex items-center gap-1.5">
                  <BadgeCheck className="size-3.5 text-primary" /> Bekräftelse
                  direkt
                </span>
              </div>
            </div>
          )}
        </div>

        <p className="pb-8 text-center text-xs text-muted-foreground">
          {org.name} · {org.phone} · {org.email} · {formatDate(co.createdAt)}
        </p>
      </main>
    </div>
  );
}
