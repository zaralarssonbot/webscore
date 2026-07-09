import type {
  InvoiceDraftItem,
  MaterialEntry,
  QuoteItem,
  QuoteTotals,
} from "./types";

/** Line total excluding VAT, after the row discount. */
export function lineNet(item: {
  quantity: number;
  unitPrice: number;
  discountPct: number;
}) {
  const gross = item.quantity * item.unitPrice;
  return gross * (1 - (item.discountPct || 0) / 100);
}

/** Compute full quote totals (subtotal, discount, VAT, grand total). */
export function quoteTotals(items: QuoteItem[]): QuoteTotals {
  let subtotal = 0;
  let discountTotal = 0;
  let vatTotal = 0;
  for (const item of items) {
    const gross = item.quantity * item.unitPrice;
    const net = gross * (1 - (item.discountPct || 0) / 100);
    subtotal += net;
    discountTotal += gross - net;
    vatTotal += net * ((item.vatRate || 0) / 100);
  }
  return {
    subtotal: round(subtotal),
    discountTotal: round(discountTotal),
    vatTotal: round(vatTotal),
    total: round(subtotal + vatTotal),
  };
}

/** Totals for an invoice draft (same shape, simpler items). */
export function invoiceTotals(items: InvoiceDraftItem[]): QuoteTotals {
  let subtotal = 0;
  let vatTotal = 0;
  for (const item of items) {
    const net = item.quantity * item.unitPrice;
    subtotal += net;
    vatTotal += net * ((item.vatRate || 0) / 100);
  }
  return {
    subtotal: round(subtotal),
    discountTotal: 0,
    vatTotal: round(vatTotal),
    total: round(subtotal + vatTotal),
  };
}

/** Material cost / revenue / margin summary. */
export function materialSummary(entries: MaterialEntry[]) {
  let purchase = 0;
  let revenue = 0;
  for (const e of entries) {
    purchase += e.quantity * e.purchasePrice;
    revenue += e.quantity * e.customerPrice;
  }
  const margin = revenue - purchase;
  const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
  return {
    purchase: round(purchase),
    revenue: round(revenue),
    margin: round(margin),
    marginPct: round(marginPct),
  };
}

export function round(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
