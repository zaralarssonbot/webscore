import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getQuoteByToken, getCustomer } from "@/lib/queries";
import { store } from "@/lib/db/store";
import { markQuoteOpened } from "@/lib/actions";
import { quoteTotals } from "@/lib/calc";
import { QuotePreview } from "@/components/quotes/quote-preview";
import { PublicQuoteActions } from "@/components/quotes/public-quote-actions";
import { WebscoreMark } from "@/components/app/logo";
import { quoteStatus } from "@/lib/status";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatSEK, formatDate } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  BadgeCheck,
  Lock,
} from "lucide-react";

export const metadata: Metadata = { title: "Offert · Webscore Work" };

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const quote = getQuoteByToken(token);
  if (!quote) notFound();

  // Mark as opened (best-effort) when the customer views it.
  await markQuoteOpened(token);

  const customer = getCustomer(quote.customerId);
  const org = store.organization;
  const totals = quoteTotals(quote.items);
  const decided = ["approved", "declined"].includes(quote.status);
  const changeRequested = quote.status === "change_requested";
  const daysLeft = quote.validUntil
    ? Math.ceil(
        (new Date(quote.validUntil).getTime() - new Date().getTime()) /
          86_400_000
      )
    : null;

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Branded header */}
      <header className="bg-brand-mesh text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white text-sm font-bold tracking-tight text-[color:var(--brand)] shadow-sm ring-1 ring-black/5">
              {org.logoText}
            </span>
            <div className="leading-tight">
              <p className="text-[15px] font-bold tracking-tight">{org.name}</p>
              <p className="text-xs text-white/70">
                Offert {quote.number}
                {org.orgNumber ? ` · Org.nr ${org.orgNumber}` : ""}
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/15">
            <Lock className="size-3.5" /> Säker länk
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:py-8">
        {/* Decision banners */}
        {decided && (
          <div
            className={`flex items-center gap-3 rounded-xl border p-4 ${
              quote.status === "approved"
                ? "border-status-green-fg/25 bg-status-green-bg text-status-green-fg"
                : "border-status-red-fg/25 bg-status-red-bg text-status-red-fg"
            }`}
          >
            {quote.status === "approved" ? (
              <CheckCircle2 className="size-5" />
            ) : (
              <XCircle className="size-5" />
            )}
            <div>
              <p className="text-sm font-semibold">
                {quote.status === "approved"
                  ? "Tack! Offerten är godkänd."
                  : "Offerten är avböjd."}
              </p>
              <p className="text-xs opacity-80">
                {formatDate(quote.approvals.at(-1)?.decidedAt)}
              </p>
            </div>
          </div>
        )}
        {changeRequested && (
          <div className="flex items-center gap-3 rounded-xl border border-status-amber-fg/25 bg-status-amber-bg p-4 text-status-amber-fg">
            <Clock className="size-5" />
            <p className="text-sm font-semibold">
              Tack! Vi har tagit emot din begäran om ändring och återkommer med
              en uppdaterad offert.
            </p>
          </div>
        )}

        {/* Premium price + action box (shown before decision) */}
        {!decided && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge meta={quoteStatus[quote.status]} />
                  <span className="text-xs text-muted-foreground">
                    Giltig till {formatDate(quote.validUntil)}
                  </span>
                  {daysLeft !== null && daysLeft >= 0 && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        daysLeft <= 3
                          ? "bg-status-amber-bg text-status-amber-fg"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      <Clock className="size-3" />
                      {daysLeft === 0
                        ? "Sista dagen"
                        : `${daysLeft} ${daysLeft === 1 ? "dag" : "dagar"} kvar`}
                    </span>
                  )}
                </div>
                <h1 className="mt-2 text-xl font-bold tracking-tight">
                  {quote.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Till {customer?.companyName ?? customer?.name}
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-status-green-bg px-2.5 py-1 text-[11px] font-medium text-status-green-fg ring-1 ring-status-green-fg/15">
                  <BadgeCheck className="size-3.5" /> Verifierad avsändare ·{" "}
                  {org.name}
                </span>
              </div>
              <div className="shrink-0 rounded-xl bg-accent px-5 py-3 text-right">
                <p className="text-xs font-medium text-accent-foreground/80">
                  Att betala inkl. moms
                </p>
                <p className="text-[30px] font-bold leading-none tracking-tight text-accent-foreground tabular-nums">
                  {formatSEK(totals.total)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  varav moms {formatSEK(totals.vatTotal)}
                </p>
              </div>
            </div>
            <div className="border-t border-border bg-muted/30 p-6">
              <PublicQuoteActions token={token} />
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-status-green-fg" /> Säker
                  hantering
                </span>
                <span className="flex items-center gap-1.5">
                  <BadgeCheck className="size-3.5 text-primary" /> Bekräftelse
                  direkt
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="size-3.5" /> BankID kan aktiveras
                </span>
              </div>
            </div>
          </div>
        )}

        <QuotePreview quote={quote} customer={customer} org={org} />

        {/* Trust footer */}
        <div className="space-y-3 pb-10 pt-2 text-center">
          <p className="text-xs text-muted-foreground">
            {org.name}
            {org.orgNumber ? ` · Org.nr ${org.orgNumber}` : ""} · {org.phone} ·{" "}
            {org.email}
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70">
            <Lock className="size-3" />
            <span>Levereras säkert via</span>
            <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
              <WebscoreMark size={12} color="currentColor" trackOpacity={0.3} />
              Webscore Work
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
