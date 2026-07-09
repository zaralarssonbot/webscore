import { invoiceTotals } from "@/lib/calc";
import { formatSEK, formatDate, formatNumber } from "@/lib/utils";
import type { Customer, InvoiceDraft, Organization } from "@/lib/types";

/** Print-ready invoice basis document. */
export function InvoicePreview({
  invoice,
  customer,
  org,
}: {
  invoice: InvoiceDraft;
  customer?: Customer;
  org: Organization;
}) {
  const totals = invoiceTotals(invoice.items);
  const addr =
    customer?.addresses.find((a) => a.type === "invoice") ??
    customer?.addresses[0];

  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-900 shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
      {/* Faint monogram watermark — premium letterhead detail */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-8 right-4 z-0 select-none text-[150px] font-black leading-none tracking-tighter text-zinc-900/[0.035]"
      >
        {org.logoText}
      </span>
      {/* Branded header band */}
      <div className="bg-brand-mesh flex items-center justify-between px-8 py-6 text-white sm:px-10">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-white text-sm font-bold tracking-tight text-[color:var(--brand)] shadow-sm">
            {org.logoText}
          </span>
          <div>
            <p className="text-[15px] font-bold tracking-tight">{org.name}</p>
            <p className="text-xs text-white/70">Org.nr {org.orgNumber}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
            Fakturaunderlag
          </p>
          <p className="text-xl font-bold tracking-tight">{invoice.number}</p>
          <p className="text-xs text-white/70">{formatDate(invoice.createdAt)}</p>
        </div>
      </div>

      <div className="relative z-10 p-8 sm:p-10">
        <div className="grid grid-cols-2 gap-6 pb-6">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-400">
              Faktureras
            </p>
            <p className="text-sm font-medium">
              {customer?.companyName ?? customer?.name ?? "—"}
            </p>
            {addr && (
              <p className="text-sm text-zinc-600">
                {addr.street}, {addr.postalCode} {addr.city}
              </p>
            )}
            {customer?.orgNumber && (
              <p className="text-sm text-zinc-600">Org.nr {customer.orgNumber}</p>
            )}
          </div>
          <div className="text-right">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-400">
              Referens
            </p>
            <p className="text-sm font-medium">{invoice.reference}</p>
            <p className="text-sm text-zinc-600">{org.paymentTerms}</p>
          </div>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-400">
              <th className="py-2 font-medium">Beskrivning</th>
              <th className="py-2 text-right font-medium">Antal</th>
              <th className="hidden py-2 text-right font-medium sm:table-cell">
                À-pris
              </th>
              <th className="hidden py-2 text-right font-medium sm:table-cell">
                Moms
              </th>
              <th className="py-2 text-right font-medium">Belopp</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-zinc-100">
                <td className="py-2.5 font-medium">{item.description}</td>
                <td className="py-2.5 text-right tabular-nums">
                  {formatNumber(item.quantity, item.quantity % 1 ? 1 : 0)}{" "}
                  {item.unit}
                </td>
                <td className="hidden py-2.5 text-right tabular-nums sm:table-cell">
                  {formatSEK(item.unitPrice)}
                </td>
                <td className="hidden py-2.5 text-right tabular-nums text-zinc-500 sm:table-cell">
                  {item.vatRate}%
                </td>
                <td className="py-2.5 text-right font-medium tabular-nums">
                  {formatSEK(item.quantity * item.unitPrice)}
                </td>
              </tr>
            ))}
            {invoice.items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-zinc-400">
                  Inga rader
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-5 flex justify-end">
          <div className="w-72 text-sm">
            <div className="flex justify-between py-1 text-zinc-600">
              <span>Summa exkl. moms</span>
              <span className="tabular-nums">{formatSEK(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between py-1 text-zinc-600">
              <span>Moms</span>
              <span className="tabular-nums">{formatSEK(totals.vatTotal)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-[color:var(--brand)] px-4 py-3 text-white [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
              <span className="text-sm font-semibold">Totalt att fakturera</span>
              <span className="text-lg font-bold tabular-nums">
                {formatSEK(totals.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Refined footer with hairline accent rule */}
        <div className="mt-8 border-t border-zinc-200 pt-4">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>
              {org.name} · {org.phone} · {org.email}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[color:var(--brand)]" />
              Skapad i Webscore Work
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
