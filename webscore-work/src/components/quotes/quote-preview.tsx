import { quoteTotals, lineNet } from "@/lib/calc";
import { formatSEK, formatDate, formatNumber } from "@/lib/utils";
import type { Customer, Organization, Quote } from "@/lib/types";

const kindLabel: Record<string, string> = {
  labor: "Arbete",
  material: "Material",
  other: "Övrigt",
};

/** Professional, print-ready quote document. */
export function QuotePreview({
  quote,
  customer,
  org,
}: {
  quote: Quote;
  customer?: Customer;
  org: Organization;
}) {
  const totals = quoteTotals(quote.items);
  const invoiceAddr =
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
      <div className="bg-brand-mesh flex items-center justify-between gap-4 px-8 py-6 text-white sm:px-10">
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
            Offert
          </p>
          <p className="text-xl font-bold tracking-tight">{quote.number}</p>
          <p className="text-xs text-white/70">{formatDate(quote.createdAt)}</p>
        </div>
      </div>

      <div className="relative z-10 p-8 sm:p-10">
        {/* Parties */}
        <div className="grid grid-cols-2 gap-6 pb-6">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-400">
              Från
            </p>
            <p className="text-sm font-medium">{org.name}</p>
            <p className="text-sm text-zinc-600">{org.address}</p>
            <p className="text-sm text-zinc-600">{org.phone}</p>
            <p className="text-sm text-zinc-600">{org.email}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-400">
              Till
            </p>
            <p className="text-sm font-medium">
              {customer?.companyName ?? customer?.name ?? "—"}
            </p>
            {customer?.companyName && (
              <p className="text-sm text-zinc-600">{customer.name}</p>
            )}
            {invoiceAddr && (
              <p className="text-sm text-zinc-600">
                {invoiceAddr.street}, {invoiceAddr.postalCode}{" "}
                {invoiceAddr.city}
              </p>
            )}
            {customer?.email && (
              <p className="text-sm text-zinc-600">{customer.email}</p>
            )}
          </div>
        </div>

        {/* Title + description */}
        <div className="pb-4">
          <h2 className="text-xl font-semibold">{quote.title}</h2>
          {quote.description && (
            <p className="mt-1 text-sm text-zinc-600">{quote.description}</p>
          )}
        </div>

        {/* Items table */}
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
            {quote.items.map((item) => (
              <tr key={item.id} className="border-b border-zinc-100">
                <td className="py-2.5">
                  <span className="font-medium">{item.description}</span>
                  <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
                    {kindLabel[item.kind]}
                  </span>
                  {item.discountPct > 0 && (
                    <span className="ml-1 text-xs text-emerald-600">
                      −{item.discountPct}%
                    </span>
                  )}
                </td>
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
                  {formatSEK(lineNet(item))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-72 space-y-1.5 text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>Summa exkl. moms</span>
              <span className="tabular-nums">{formatSEK(totals.subtotal)}</span>
            </div>
            {totals.discountTotal > 0 && (
              <div className="flex justify-between text-zinc-600">
                <span>Rabatt</span>
                <span className="tabular-nums">
                  −{formatSEK(totals.discountTotal)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-zinc-600">
              <span>Moms</span>
              <span className="tabular-nums">{formatSEK(totals.vatTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-1.5 text-base font-semibold">
              <span>Att betala</span>
              <span className="tabular-nums">{formatSEK(totals.total)}</span>
            </div>
            <p className="pt-1 text-right text-xs text-zinc-400">
              {quote.pricingType === "fixed" ? "Fast pris" : "Uppskattat pris"}
            </p>
          </div>
        </div>

        {/* Meta + terms */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-zinc-200 pt-5 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">
              Giltig till
            </p>
            <p className="font-medium">{formatDate(quote.validUntil)}</p>
          </div>
          {quote.startDate && (
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-400">
                Beräknad period
              </p>
              <p className="font-medium">
                {formatDate(quote.startDate)} – {formatDate(quote.endDate)}
              </p>
            </div>
          )}
          <div className="col-span-2">
            <p className="text-xs uppercase tracking-wide text-zinc-400">
              Betalningsvillkor
            </p>
            <p className="font-medium">{quote.paymentTerms}</p>
          </div>
          {quote.terms && (
            <div className="col-span-2">
              <p className="text-xs uppercase tracking-wide text-zinc-400">
                Villkor
              </p>
              <p className="whitespace-pre-line text-zinc-600">{quote.terms}</p>
            </div>
          )}
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
