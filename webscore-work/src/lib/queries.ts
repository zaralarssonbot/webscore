import { store } from "./db/store";
import { materialSummary, quoteTotals } from "./calc";
import type {
  Customer,
  Quote,
  TimeEntry,
  User,
} from "./types";

/**
 * Read-side data access. Everything is scoped by organizationId to enforce
 * tenant isolation (mirrors the Supabase RLS policies in /supabase).
 */

const ORG = () => store.organization.id;
const inOrg = <T extends { organizationId: string }>(rows: T[]) =>
  rows.filter((r) => r.organizationId === ORG());

/* -------------------------------- Lookups -------------------------------- */
export function getUser(id?: string): User | undefined {
  return store.users.find((u) => u.id === id);
}
export function userName(id?: string) {
  return getUser(id)?.name ?? "—";
}
export function getCustomer(id?: string): Customer | undefined {
  return store.customers.find((c) => c.id === id);
}
export function customerName(id?: string) {
  return getCustomer(id)?.name ?? "Okänd kund";
}

/* -------------------------------- Listings ------------------------------- */
export const listUsers = () => inOrg(store.users);
export const listCustomers = () =>
  inOrg(store.customers).sort((a, b) => a.name.localeCompare(b.name, "sv"));
export const listInquiries = () =>
  inOrg(store.inquiries).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const listQuotes = () =>
  inOrg(store.quotes).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const listProjects = () =>
  inOrg(store.projects).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const listWorkOrders = () => inOrg(store.workOrders);
export const listTimeEntries = () => inOrg(store.timeEntries);
export const listMaterials = () => inOrg(store.materials);
export const listAttachments = () => inOrg(store.attachments);
export const listChangeOrders = () => inOrg(store.changeOrders);
export const listInvoiceDrafts = () =>
  inOrg(store.invoiceDrafts).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
export const listActivity = () =>
  inOrg(store.activity).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export function listNotifications(userId?: string) {
  return inOrg(store.notifications)
    .filter((n) => !n.userId || n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* -------------------------------- By id ---------------------------------- */
export const getQuote = (id: string) =>
  store.quotes.find((q) => q.id === id && q.organizationId === ORG());
export const getQuoteByToken = (token: string) =>
  store.quotes.find((q) => q.publicToken === token);
export const getProject = (id: string) =>
  store.projects.find((p) => p.id === id && p.organizationId === ORG());
export const getWorkOrder = (id: string) =>
  store.workOrders.find((w) => w.id === id && w.organizationId === ORG());
export const getInvoiceDraft = (id: string) =>
  store.invoiceDrafts.find((i) => i.id === id && i.organizationId === ORG());
export const getChangeOrderByToken = (token: string) =>
  store.changeOrders.find((c) => c.publicToken === token);

/* ----------------------------- Relationships ----------------------------- */
export const workOrdersForProject = (projectId: string) =>
  listWorkOrders().filter((w) => w.projectId === projectId);
export const workOrdersForCustomer = (customerId: string) =>
  listWorkOrders().filter((w) => w.customerId === customerId);
export const quotesForCustomer = (customerId: string) =>
  listQuotes().filter((q) => q.customerId === customerId);
export const projectsForCustomer = (customerId: string) =>
  listProjects().filter((p) => p.customerId === customerId);
export const timeForWorkOrder = (workOrderId: string) =>
  listTimeEntries().filter((t) => t.workOrderId === workOrderId);
export const materialsForWorkOrder = (workOrderId: string) =>
  listMaterials().filter((m) => m.workOrderId === workOrderId);
export const attachmentsForWorkOrder = (workOrderId: string) =>
  listAttachments().filter((a) => a.workOrderId === workOrderId);
export const changeOrdersForProject = (projectId: string) =>
  listChangeOrders().filter((c) => c.projectId === projectId);

export function workOrdersForUser(userId: string) {
  return listWorkOrders().filter((w) => w.assigneeIds.includes(userId));
}

/* --------------------------- Derived / totals ---------------------------- */
export function quoteValue(quote: Quote) {
  return quoteTotals(quote.items).total;
}

export function workedMinutes(entries: TimeEntry[]) {
  return entries.reduce((sum, e) => sum + e.minutes, 0);
}

/* ------------------------------ Dashboard -------------------------------- */
export function dashboardMetrics() {
  const quotes = listQuotes();
  const workOrders = listWorkOrders();
  const inquiries = listInquiries();

  const newInquiries = inquiries.filter((i) => i.status === "new").length;
  const awaitingQuotes = quotes.filter((q) =>
    ["sent", "opened", "change_requested"].includes(q.status)
  );
  const activeWork = workOrders.filter((w) =>
    ["in_progress", "planned", "paused", "waiting_material", "review"].includes(
      w.status
    )
  );

  // Unbilled = approved/completed work value not yet exported to an invoice.
  const invoicedWoIds = new Set(
    listInvoiceDrafts().map((i) => i.workOrderId).filter(Boolean)
  );
  const unbilled = listProjects()
    .filter((p) => p.status !== "invoiced")
    .reduce((sum, p) => {
      const q = p.quoteId ? getQuote(p.quoteId) : undefined;
      return sum + (q ? quoteValue(q) : 0);
    }, 0);

  return {
    newInquiries,
    awaitingQuotesCount: awaitingQuotes.length,
    activeWorkCount: activeWork.length,
    unbilled,
    invoicedWoIds,
    awaitingQuotes,
    activeWork,
  };
}

export function quoteMonthlyValues() {
  // Aggregate quote value per month (last 6 months) for the chart.
  const months: { key: string; label: string; value: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    months.push({
      key,
      label: d.toLocaleDateString("sv-SE", { month: "short" }),
      value: 0,
    });
  }
  for (const q of listQuotes()) {
    const d = new Date(q.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = months.find((m) => m.key === key);
    if (bucket) bucket.value += quoteValue(q);
  }
  return months;
}

export function quoteOutcomeSplit() {
  const quotes = listQuotes();
  return {
    approved: quotes.filter((q) => q.status === "approved").length,
    declined: quotes.filter((q) => q.status === "declined").length,
    pending: quotes.filter((q) =>
      ["sent", "opened", "change_requested", "draft"].includes(q.status)
    ).length,
  };
}

export function materialMarginSummary() {
  return materialSummary(listMaterials());
}
