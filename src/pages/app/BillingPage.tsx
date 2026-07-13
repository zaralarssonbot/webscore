import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Loader2, CreditCard, ArrowUpRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useEntitlements } from "@/hooks/useEntitlements";
import { billingEnabled } from "@/lib/account/limits";
import { openPortal, listInvoices } from "@/lib/billing/billing-service";
import { planById } from "@/lib/billing/plans";
import UsageMeter from "@/components/app/UsageMeter";
import PlanBadge from "@/components/app/PlanBadge";
import EmptyState from "@/components/app/EmptyState";

function fmtAmount(minor: number | null, currency: string | null): string {
  if (minor == null) return "—";
  return `${(minor / 100).toLocaleString("sv-SE")} ${(currency ?? "sek").toUpperCase()}`;
}

export default function BillingPage() {
  useDocumentMeta({ title: "Fakturering – Webscore", noindex: true });
  const [params] = useSearchParams();
  const { data: ent, isLoading, refetch } = useEntitlements();
  const [portalBusy, setPortalBusy] = useState(false);

  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: listInvoices, enabled: billingEnabled() });

  // Returning from Stripe: refetch entitlements (webhook may still be settling).
  useEffect(() => {
    const status = params.get("status");
    if (status === "success") { toast.success("Tack! Din plan uppdateras strax."); const t = setTimeout(() => refetch(), 2500); return () => clearTimeout(t); }
    if (status === "cancelled") toast("Betalningen avbröts.");
  }, [params, refetch]);

  const manage = async () => {
    setPortalBusy(true);
    const r = await openPortal();
    setPortalBusy(false);
    if (r.url) window.location.href = r.url;
    else toast.error(r.error === "no_customer" ? "Ingen aktiv prenumeration att hantera." : (r.error ?? "Kunde inte öppna portalen"));
  };

  if (!billingEnabled()) {
    return <EmptyState icon={CreditCard} title="Fakturering är inte aktiverad ännu" />;
  }
  if (isLoading || !ent) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>;
  }

  const plan = planById(ent.plan);
  const sub = ent.subscription;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">Fakturering</h1>

      {/* Current plan */}
      <div className="card-surface p-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">{plan.name}</span>
            <PlanBadge plan={ent.plan} />
            {ent.inGrace && <span className="text-xs text-score-mid">respitperiod</span>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {sub?.status === "trialing" && sub.trial_end && `Provperiod till ${new Date(sub.trial_end).toLocaleDateString("sv-SE")}`}
            {sub?.status === "active" && sub.current_period_end && (sub.cancel_at_period_end
              ? `Avslutas ${new Date(sub.current_period_end).toLocaleDateString("sv-SE")}`
              : `Förnyas ${new Date(sub.current_period_end).toLocaleDateString("sv-SE")}`)}
            {(!sub || ent.plan === "free") && "Gratisplan"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/plans"><ArrowUpRight className="w-4 h-4 mr-1" />Byt plan</Link></Button>
          {ent.plan !== "free" && (
            <Button onClick={manage} disabled={portalBusy}>
              {portalBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CreditCard className="w-4 h-4 mr-1" />Hantera</>}
            </Button>
          )}
        </div>
      </div>

      {/* Usage */}
      <div>
        <h2 className="text-sm font-semibold mb-2">Användning denna månad</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <UsageMeter label="Analyser" used={ent.usage.analyses_month} limit={ent.limits.analyses_month} />
          <UsageMeter label="PDF-rapporter" used={ent.usage.pdf_month} limit={ent.limits.pdf_month} />
          <UsageMeter label="Domäner" used={ent.usage.domains_active} limit={ent.limits.domains_active} />
        </div>
      </div>

      {/* Invoices */}
      <div>
        <h2 className="text-sm font-semibold mb-2">Fakturor</h2>
        {invoices.length === 0 ? (
          <div className="card-surface p-6 text-center text-sm text-muted-foreground">Inga fakturor ännu.</div>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="card-surface px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm font-medium">{inv.number ?? inv.id}</span>
                    <span className="block text-xs text-muted-foreground">{new Date(inv.created).toLocaleDateString("sv-SE")} · {inv.status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm">{fmtAmount(inv.amount_paid ?? inv.amount_due, inv.currency)}</span>
                  {inv.hosted_invoice_url && (
                    <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" aria-label="Öppna faktura">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
