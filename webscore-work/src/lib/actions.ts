"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { store, newId, resetStore } from "./db/store";
import { getSession, SESSION_COOKIE_NAME, can } from "./auth";
import { quoteTotals } from "./calc";
import { isSupabaseEnabled, BUCKETS } from "./supabase/config";
import { createSupabaseServerClient } from "./supabase/server";
import { storeFile } from "./supabase/storage";
import { upsertCustomerDb } from "./data/customers";
import type {
  ActivityLog,
  AppNotification,
  AttachmentCategory,
  ChangeOrder,
  Customer,
  Inquiry,
  InquiryStatus,
  InvoiceDraft,
  MaterialEntry,
  NotificationKind,
  Project,
  Quote,
  QuoteItem,
  QuoteStatus,
  TimeEntry,
  WorkOrder,
  WorkOrderStatus,
} from "./types";

type Result = { ok: true; id?: string } | { ok: false; error: string };

const DENIED: Result = {
  ok: false,
  error: "Du har inte behörighet att göra detta.",
};

/* ------------------------------- internals ------------------------------- */
async function org() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

function log(
  entry: Omit<ActivityLog, "id" | "organizationId" | "createdAt">,
  orgId: string
) {
  store.activity.unshift({
    ...entry,
    id: newId("a"),
    organizationId: orgId,
    createdAt: new Date().toISOString(),
  });
}

function notify(
  n: Omit<AppNotification, "id" | "organizationId" | "createdAt" | "read">,
  orgId: string
) {
  store.notifications.unshift({
    ...n,
    id: newId("n"),
    organizationId: orgId,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

function token(prefix: string) {
  return `tok_${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function refresh() {
  revalidatePath("/", "layout");
}

/* --------------------------------- auth ---------------------------------- */
/** Demo login — pick a seeded user, no password. Disabled in Supabase mode. */
export async function login(formData: FormData) {
  if (isSupabaseEnabled())
    return { ok: false as const, error: "Demo-inloggning är avstängd." };
  const userId = String(formData.get("userId") || "");
  const user = store.users.find((u) => u.id === userId && u.active);
  if (!user) return { ok: false as const, error: "Okänd användare" };
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/dashboard");
}

/** Real Supabase Auth sign-in with email + password. */
export async function signInWithPassword(formData: FormData) {
  if (!isSupabaseEnabled())
    return { ok: false as const, error: "Supabase är inte konfigurerat." };
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !password)
    return { ok: false as const, error: "Fyll i e-post och lösenord." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false as const, error: "Fel e-post eller lösenord." };
  redirect("/dashboard");
}

export async function logout() {
  if (isSupabaseEnabled()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } else {
    const jar = await cookies();
    jar.delete(SESSION_COOKIE_NAME);
  }
  redirect("/login");
}

/* ------------------------------- customers ------------------------------- */
export async function saveCustomer(
  input: Omit<Customer, "id" | "organizationId" | "createdAt" | "addresses"> & {
    id?: string;
    street?: string;
    postalCode?: string;
    city?: string;
  }
): Promise<Result> {
  const { user, organization } = await org();
  if (!can.manageCustomers(user.role)) return DENIED;

  // Supabase mode: persist to Postgres via the ported data layer.
  if (isSupabaseEnabled()) {
    try {
      const id = await upsertCustomerDb(organization.id, input);
      const supabase = await createSupabaseServerClient();
      await supabase.from("activity_logs").insert({
        organization_id: organization.id,
        actor_id: user.id,
        actor_name: user.name,
        action: input.id ? "uppdaterade kund" : "skapade kund",
        entity_type: "customer",
        entity_id: id,
        href: `/customers/${id}`,
      });
      refresh();
      return { ok: true, id };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Fel" };
    }
  }

  // Demo mode: mutate the in-memory store.
  const existing = input.id
    ? store.customers.find((c) => c.id === input.id)
    : undefined;

  const address = {
    id: newId("addr"),
    label: input.type === "company" ? "Fakturaadress" : "Hemadress",
    type: "invoice" as const,
    street: input.street ?? "",
    postalCode: input.postalCode ?? "",
    city: input.city ?? "",
  };

  if (existing) {
    Object.assign(existing, {
      type: input.type,
      name: input.name,
      companyName: input.companyName,
      orgNumber: input.orgNumber,
      phone: input.phone,
      email: input.email,
      notes: input.notes,
    });
    log(
      { actorId: user.id, actorName: user.name, action: "uppdaterade kund", entityType: "customer", entityId: existing.id, href: `/customers/${existing.id}` },
      organization.id
    );
    refresh();
    return { ok: true, id: existing.id };
  }

  const customer: Customer = {
    id: newId("c"),
    organizationId: organization.id,
    type: input.type,
    name: input.name,
    companyName: input.companyName,
    orgNumber: input.orgNumber,
    phone: input.phone,
    email: input.email,
    notes: input.notes,
    addresses: address.street ? [address] : [],
    createdAt: new Date().toISOString(),
  };
  store.customers.push(customer);
  log(
    { actorId: user.id, actorName: user.name, action: "skapade kund", entityType: "customer", entityId: customer.id, href: `/customers/${customer.id}` },
    organization.id
  );
  refresh();
  return { ok: true, id: customer.id };
}

/* --------------------------------- quotes -------------------------------- */
function nextNumber(prefix: string, rows: { number: string }[]) {
  const nums = rows
    .map((r) => parseInt(r.number.split("-").pop() || "0", 10))
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export async function saveQuote(input: {
  id?: string;
  customerId: string;
  title: string;
  description: string;
  pricingType: "fixed" | "estimate";
  validUntil: string;
  startDate?: string;
  endDate?: string;
  terms: string;
  paymentTerms: string;
  items: QuoteItem[];
}): Promise<Result> {
  const { user, organization } = await org();
  if (!can.createQuotes(user.role)) return DENIED;
  const items = input.items.map((it) => ({ ...it, id: it.id || newId("qi") }));

  const existing = input.id
    ? store.quotes.find((q) => q.id === input.id)
    : undefined;

  if (existing) {
    Object.assign(existing, {
      customerId: input.customerId,
      title: input.title,
      description: input.description,
      pricingType: input.pricingType,
      validUntil: input.validUntil,
      startDate: input.startDate,
      endDate: input.endDate,
      terms: input.terms,
      paymentTerms: input.paymentTerms,
      items,
    });
    log({ actorId: user.id, actorName: user.name, action: "uppdaterade offert", entityType: "quote", entityId: existing.id, href: `/quotes/${existing.id}` }, organization.id);
    refresh();
    return { ok: true, id: existing.id };
  }

  const quote: Quote = {
    id: newId("q"),
    organizationId: organization.id,
    number: nextNumber(organization.quoteNumberPrefix, store.quotes),
    customerId: input.customerId,
    title: input.title,
    description: input.description,
    status: "draft",
    pricingType: input.pricingType,
    items,
    validUntil: input.validUntil,
    startDate: input.startDate,
    endDate: input.endDate,
    terms: input.terms || organization.quoteTerms,
    paymentTerms: input.paymentTerms || organization.paymentTerms,
    publicToken: token("q"),
    ownerId: user.id,
    createdAt: new Date().toISOString(),
    approvals: [],
  };
  store.quotes.push(quote);
  log({ actorId: user.id, actorName: user.name, action: "skapade offert", entityType: "quote", entityId: quote.id, href: `/quotes/${quote.id}` }, organization.id);
  refresh();
  return { ok: true, id: quote.id };
}

export async function setQuoteStatus(
  id: string,
  status: QuoteStatus
): Promise<Result> {
  const { user, organization } = await org();
  if (!can.manageQuotes(user.role)) return DENIED;
  const quote = store.quotes.find((q) => q.id === id);
  if (!quote) return { ok: false, error: "Offert saknas" };
  quote.status = status;
  if (status === "sent" && !quote.sentAt) quote.sentAt = new Date().toISOString();
  log({ actorId: user.id, actorName: user.name, action: `ändrade offertstatus till ${status}`, entityType: "quote", entityId: id, href: `/quotes/${id}` }, organization.id);
  refresh();
  return { ok: true };
}

/** Public quote decision (no auth — token-scoped). */
export async function decideQuote(
  tokenValue: string,
  data: {
    decision: "approved" | "declined" | "change_requested";
    name: string;
    email: string;
    comment?: string;
    termsAccepted: boolean;
    ip?: string;
  }
): Promise<Result> {
  const quote = store.quotes.find((q) => q.publicToken === tokenValue);
  if (!quote) return { ok: false, error: "Offert saknas" };
  if (["approved", "declined"].includes(quote.status))
    return { ok: false, error: "Offerten är redan besvarad" };

  quote.approvals.push({
    id: newId("qa"),
    quoteId: quote.id,
    decision: data.decision,
    name: data.name,
    email: data.email,
    comment: data.comment,
    termsAccepted: data.termsAccepted,
    ipAddress: data.ip,
    decidedAt: new Date().toISOString(),
  });
  quote.status =
    data.decision === "approved"
      ? "approved"
      : data.decision === "declined"
        ? "declined"
        : "change_requested";

  const kind: NotificationKind =
    data.decision === "approved"
      ? "quote_approved"
      : data.decision === "declined"
        ? "quote_declined"
        : "change_order_pending";
  notify(
    {
      kind,
      title:
        data.decision === "approved"
          ? "Offert godkänd"
          : data.decision === "declined"
            ? "Offert avböjd"
            : "Ändring begärd",
      body: `${data.name} svarade på ${quote.number} – ${quote.title}.`,
      href: `/quotes/${quote.id}`,
    },
    quote.organizationId
  );
  log({ actorName: data.name, action: `svarade på offert (${data.decision})`, entityType: "quote", entityId: quote.id, href: `/quotes/${quote.id}` }, quote.organizationId);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Mark a quote opened when the public page is viewed. */
export async function markQuoteOpened(tokenValue: string) {
  const quote = store.quotes.find((q) => q.publicToken === tokenValue);
  if (!quote) return;
  if (quote.status === "sent") {
    quote.status = "opened";
    quote.openedAt = new Date().toISOString();
    notify({ kind: "quote_opened", title: "Offert öppnad", body: `Kunden öppnade ${quote.number} – ${quote.title}.`, href: `/quotes/${quote.id}` }, quote.organizationId);
  }
}

export async function convertQuoteToProject(quoteId: string): Promise<Result> {
  const { user, organization } = await org();
  if (!can.manageQuotes(user.role)) return DENIED;
  const quote = store.quotes.find((q) => q.id === quoteId);
  if (!quote) return { ok: false, error: "Offert saknas" };
  if (quote.projectId) return { ok: true, id: quote.projectId };

  const totals = quoteTotals(quote.items);
  const customer = store.customers.find((c) => c.id === quote.customerId);
  const workAddress =
    customer?.addresses.find((a) => a.type === "work") ??
    customer?.addresses[0];

  const project: Project = {
    id: newId("p"),
    organizationId: organization.id,
    name: `${quote.title} – ${customer?.name ?? ""}`.trim(),
    customerId: quote.customerId,
    quoteId: quote.id,
    address: workAddress
      ? `${workAddress.street}, ${workAddress.postalCode} ${workAddress.city}`
      : "",
    managerId: quote.ownerId,
    memberIds: [],
    startDate: quote.startDate,
    endDate: quote.endDate,
    budget: totals.total,
    laborBudgetHours: quote.items
      .filter((i) => i.kind === "labor")
      .reduce((s, i) => s + i.quantity, 0),
    materialBudget: quote.items
      .filter((i) => i.kind === "material")
      .reduce((s, i) => s + i.quantity * i.unitPrice, 0),
    status: "planned",
    createdAt: new Date().toISOString(),
  };
  store.projects.push(project);
  quote.projectId = project.id;
  log({ actorId: user.id, actorName: user.name, action: "skapade projekt från offert", entityType: "project", entityId: project.id, href: `/projects/${project.id}` }, organization.id);
  refresh();
  return { ok: true, id: project.id };
}

/* ------------------------------ work orders ------------------------------ */
export async function saveWorkOrder(input: {
  id?: string;
  title: string;
  customerId: string;
  projectId?: string;
  address: string;
  description: string;
  instructions?: string;
  assigneeIds: string[];
  supervisorId: string;
  date?: string;
  startTime?: string;
  estimatedEndTime?: string;
  priority: "low" | "normal" | "high" | "urgent";
}): Promise<Result> {
  const { user, organization } = await org();
  if (!can.planWorkOrders(user.role)) return DENIED;
  const existing = input.id
    ? store.workOrders.find((w) => w.id === input.id)
    : undefined;

  if (existing) {
    Object.assign(existing, input);
    log({ actorId: user.id, actorName: user.name, action: "uppdaterade arbetsorder", entityType: "work_order", entityId: existing.id, href: `/work-orders/${existing.id}` }, organization.id);
    refresh();
    return { ok: true, id: existing.id };
  }

  const wo: WorkOrder = {
    id: newId("wo"),
    organizationId: organization.id,
    number: nextNumber(organization.workOrderNumberPrefix, store.workOrders),
    customerId: input.customerId,
    projectId: input.projectId,
    address: input.address,
    title: input.title,
    description: input.description,
    instructions: input.instructions,
    assigneeIds: input.assigneeIds,
    supervisorId: input.supervisorId,
    date: input.date,
    startTime: input.startTime,
    estimatedEndTime: input.estimatedEndTime,
    priority: input.priority,
    status: input.assigneeIds.length && input.date ? "planned" : "unplanned",
    checklist: [],
    createdAt: new Date().toISOString(),
  };
  store.workOrders.push(wo);
  for (const uid of input.assigneeIds) {
    notify({ userId: uid, kind: "assignment", title: "Ny tilldelning", body: `Du har tilldelats ${wo.number} – ${wo.title}.`, href: `/my-work/${wo.id}` }, organization.id);
  }
  log({ actorId: user.id, actorName: user.name, action: "skapade arbetsorder", entityType: "work_order", entityId: wo.id, href: `/work-orders/${wo.id}` }, organization.id);
  refresh();
  return { ok: true, id: wo.id };
}

export async function setWorkOrderStatus(
  id: string,
  status: WorkOrderStatus
): Promise<Result> {
  const { user, organization } = await org();
  const wo = store.workOrders.find((w) => w.id === id);
  if (!wo) return { ok: false, error: "Arbetsorder saknas" };
  // Workers may update operational status only on work orders they're on;
  // marking as invoiced is reserved for admins/supervisors.
  const isManager = can.planWorkOrders(user.role);
  if (!isManager && !wo.assigneeIds.includes(user.id)) return DENIED;
  if (status === "invoiced" && !isManager) return DENIED;
  wo.status = status;
  if (status === "review")
    notify({ kind: "work_order_review", title: "Klar för kontroll", body: `${wo.number} är markerad klar för kontroll.`, href: `/work-orders/${wo.id}` }, organization.id);
  log({ actorId: user.id, actorName: user.name, action: `ändrade status till ${status}`, entityType: "work_order", entityId: id, href: `/work-orders/${id}` }, organization.id);
  refresh();
  return { ok: true };
}

export async function toggleChecklistItem(
  workOrderId: string,
  itemId: string
): Promise<Result> {
  await org();
  const wo = store.workOrders.find((w) => w.id === workOrderId);
  const item = wo?.checklist.find((c) => c.id === itemId);
  if (!item) return { ok: false, error: "Saknas" };
  item.done = !item.done;
  refresh();
  return { ok: true };
}

export async function addChecklistItem(
  workOrderId: string,
  label: string
): Promise<Result> {
  await org();
  const wo = store.workOrders.find((w) => w.id === workOrderId);
  if (!wo) return { ok: false, error: "Saknas" };
  wo.checklist.push({ id: newId("cl"), label, done: false });
  refresh();
  return { ok: true };
}

/* ----------------------------- time tracking ----------------------------- */
export async function startTimer(workOrderId: string): Promise<Result> {
  const { user, organization } = await org();
  const running = store.timeEntries.find(
    (t) => t.userId === user.id && t.status === "running"
  );
  if (running) return { ok: false, error: "Du har redan en pågående timer" };
  const entry: TimeEntry = {
    id: newId("te"),
    organizationId: organization.id,
    workOrderId,
    userId: user.id,
    date: new Date().toISOString().slice(0, 10),
    minutes: 0,
    workType: "Arbete",
    status: "running",
    startedAt: new Date().toISOString(),
  };
  store.timeEntries.push(entry);
  const wo = store.workOrders.find((w) => w.id === workOrderId);
  if (wo && wo.status === "planned") wo.status = "in_progress";
  log({ actorId: user.id, actorName: user.name, action: "startade tidregistrering", entityType: "work_order", entityId: workOrderId, href: `/work-orders/${workOrderId}` }, organization.id);
  refresh();
  return { ok: true, id: entry.id };
}

export async function stopTimer(entryId: string): Promise<Result> {
  const { user } = await org();
  const entry = store.timeEntries.find((t) => t.id === entryId);
  if (!entry || !entry.startedAt) return { ok: false, error: "Ingen timer" };
  const elapsed = Math.round(
    (Date.now() - new Date(entry.startedAt).getTime()) / 60000
  );
  entry.minutes += Math.max(1, elapsed);
  entry.startedAt = undefined;
  entry.status = "submitted";
  void user;
  refresh();
  return { ok: true };
}

export async function addManualTime(input: {
  workOrderId: string;
  minutes: number;
  date: string;
  workType: string;
  comment?: string;
}): Promise<Result> {
  const { user, organization } = await org();
  store.timeEntries.push({
    id: newId("te"),
    organizationId: organization.id,
    workOrderId: input.workOrderId,
    userId: user.id,
    date: input.date,
    minutes: input.minutes,
    workType: input.workType,
    comment: input.comment,
    status: "submitted",
  });
  refresh();
  return { ok: true };
}

export async function decideTime(
  entryId: string,
  decision: "approved" | "rejected"
): Promise<Result> {
  const { user } = await org();
  if (!can.approveTime(user.role)) return DENIED;
  const entry = store.timeEntries.find((t) => t.id === entryId);
  if (!entry) return { ok: false, error: "Saknas" };
  entry.status = decision;
  refresh();
  return { ok: true };
}

/* -------------------------------- materials ------------------------------ */
export async function addMaterial(input: {
  workOrderId: string;
  name: string;
  articleNumber?: string;
  quantity: number;
  unit: string;
  purchasePrice: number;
  customerPrice: number;
  supplier?: string;
  comment?: string;
}): Promise<Result> {
  const { user, organization } = await org();
  const wo = store.workOrders.find((w) => w.id === input.workOrderId);
  const entry: MaterialEntry = {
    id: newId("m"),
    organizationId: organization.id,
    workOrderId: input.workOrderId,
    projectId: wo?.projectId,
    name: input.name,
    articleNumber: input.articleNumber,
    quantity: input.quantity,
    unit: input.unit,
    purchasePrice: input.purchasePrice,
    customerPrice: input.customerPrice,
    supplier: input.supplier,
    comment: input.comment,
    createdBy: user.id,
    createdAt: new Date().toISOString(),
  };
  store.materials.push(entry);
  refresh();
  return { ok: true, id: entry.id };
}

/* ------------------------------ attachments ------------------------------ */
export async function addAttachment(input: {
  workOrderId?: string;
  projectId?: string;
  category: string;
  url: string;
  fileName: string;
  comment?: string;
}): Promise<Result> {
  const { user, organization } = await org();
  store.attachments.push({
    id: newId("att"),
    organizationId: organization.id,
    workOrderId: input.workOrderId,
    projectId: input.projectId,
    category: input.category as AttachmentCategory,
    url: input.url,
    fileName: input.fileName,
    comment: input.comment,
    uploadedBy: user.id,
    createdAt: new Date().toISOString(),
  });
  refresh();
  return { ok: true };
}

/**
 * Upload a file and attach it to a work order / project in one step.
 *
 * Accepts multipart FormData (the raw File, not a base64 string) so large
 * images don't bloat the request. In Supabase mode the bytes land in Storage
 * (org-scoped path); in demo mode storeFile() returns a base64 data URL so the
 * in-memory store keeps working. The resulting URL/ref is saved on the
 * attachment row.
 */
export async function uploadAttachment(formData: FormData): Promise<Result> {
  const { user, organization } = await org();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "Ingen fil vald" };
  if (file.size > 8 * 1024 * 1024)
    return { ok: false, error: "Filen är för stor (max 8 MB)" };

  const category = String(formData.get("category") || "other") as AttachmentCategory;
  const workOrderId = (formData.get("workOrderId") as string) || undefined;
  const projectId = (formData.get("projectId") as string) || undefined;
  const comment = (formData.get("comment") as string) || undefined;

  // Receipts go to the private bucket; everything else to the public one.
  const bucket = category === "receipt" ? BUCKETS.receipts : BUCKETS.attachments;
  const scope = workOrderId ?? projectId ?? "general";

  let stored;
  try {
    stored = await storeFile({ orgId: organization.id, scope, bucket, file });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Uppladdning misslyckades" };
  }

  store.attachments.push({
    id: newId("att"),
    organizationId: organization.id,
    workOrderId,
    projectId,
    category,
    url: stored.url,
    fileName: file.name,
    comment,
    uploadedBy: user.id,
    createdAt: new Date().toISOString(),
  });
  log({ actorId: user.id, actorName: user.name, action: "laddade upp bild", entityType: "attachment", entityId: workOrderId ?? projectId, href: workOrderId ? `/work-orders/${workOrderId}` : undefined }, organization.id);
  refresh();
  return { ok: true };
}

/* ----------------------------- change orders ----------------------------- */
export async function createChangeOrder(input: {
  projectId: string;
  workOrderId?: string;
  description: string;
  reason: string;
  estimatedHours: number;
  price: number;
}): Promise<Result> {
  const { user, organization } = await org();
  if (!can.planWorkOrders(user.role)) return DENIED;
  const co: ChangeOrder = {
    id: newId("co"),
    organizationId: organization.id,
    projectId: input.projectId,
    workOrderId: input.workOrderId,
    description: input.description,
    reason: input.reason,
    estimatedHours: input.estimatedHours,
    price: input.price,
    status: "sent",
    publicToken: token("co"),
    createdAt: new Date().toISOString(),
  };
  store.changeOrders.push(co);
  log({ actorId: user.id, actorName: user.name, action: "skapade tilläggsarbete", entityType: "change_order", entityId: co.id, href: `/projects/${co.projectId}` }, organization.id);
  refresh();
  return { ok: true, id: co.id };
}

export async function decideChangeOrder(
  tokenValue: string,
  data: { decision: "approved" | "declined"; name: string; comment?: string }
): Promise<Result> {
  const co = store.changeOrders.find((c) => c.publicToken === tokenValue);
  if (!co) return { ok: false, error: "Saknas" };
  co.status = data.decision;
  co.decidedBy = data.name;
  co.decidedAt = new Date().toISOString();
  co.comment = data.comment;
  notify({ kind: "change_order_pending", title: data.decision === "approved" ? "Tilläggsarbete godkänt" : "Tilläggsarbete avböjt", body: `${data.name} svarade på ett tilläggsarbete.`, href: `/projects/${co.projectId}` }, co.organizationId);
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ------------------------------ invoice drafts --------------------------- */
export async function createInvoiceFromProject(
  projectId: string
): Promise<Result> {
  const { user, organization } = await org();
  if (!can.createInvoices(user.role)) return DENIED;
  const project = store.projects.find((p) => p.id === projectId);
  if (!project) return { ok: false, error: "Projekt saknas" };

  const wos = store.workOrders.filter((w) => w.projectId === projectId);
  const woIds = new Set(wos.map((w) => w.id));
  const items: InvoiceDraft["items"] = [];

  // Labor from approved/submitted time entries.
  const minutes = store.timeEntries
    .filter((t) => woIds.has(t.workOrderId) && t.status !== "rejected")
    .reduce((s, t) => s + t.minutes, 0);
  if (minutes > 0) {
    items.push({
      id: newId("ii"),
      description: "Arbetad tid",
      quantity: Math.round((minutes / 60) * 10) / 10,
      unit: "tim",
      unitPrice: 595,
      vatRate: organization.defaultVatRate,
    });
  }
  // Materials at customer price.
  for (const m of store.materials.filter((m) => woIds.has(m.workOrderId))) {
    items.push({
      id: newId("ii"),
      description: m.name,
      quantity: m.quantity,
      unit: m.unit,
      unitPrice: m.customerPrice,
      vatRate: organization.defaultVatRate,
    });
  }
  // Approved change orders.
  for (const co of store.changeOrders.filter(
    (c) => c.projectId === projectId && c.status === "approved"
  )) {
    items.push({
      id: newId("ii"),
      description: `Tilläggsarbete: ${co.description}`,
      quantity: 1,
      unit: "st",
      unitPrice: co.price,
      vatRate: organization.defaultVatRate,
    });
  }

  const inv: InvoiceDraft = {
    id: newId("inv"),
    organizationId: organization.id,
    number: nextNumber("FAKT-2026-", store.invoiceDrafts),
    customerId: project.customerId,
    projectId: project.id,
    reference: project.name,
    items,
    status: "draft",
    createdAt: new Date().toISOString(),
  };
  store.invoiceDrafts.push(inv);
  log({ actorId: user.id, actorName: user.name, action: "skapade fakturaunderlag", entityType: "invoice", entityId: inv.id, href: `/invoices/${inv.id}` }, organization.id);
  refresh();
  return { ok: true, id: inv.id };
}

export async function setInvoiceStatus(
  id: string,
  status: InvoiceDraft["status"]
): Promise<Result> {
  const { user } = await org();
  if (!can.createInvoices(user.role)) return DENIED;
  const inv = store.invoiceDrafts.find((i) => i.id === id);
  if (!inv) return { ok: false, error: "Saknas" };
  inv.status = status;
  refresh();
  return { ok: true };
}

/* -------------------------------- inquiries ------------------------------ */
export async function saveInquiry(input: {
  customerName: string;
  companyName?: string;
  phone: string;
  email: string;
  address: string;
  workType: string;
  description: string;
  desiredDate?: string;
  source: string;
  ownerId?: string;
}): Promise<Result> {
  const { user, organization } = await org();
  if (!can.manageCustomers(user.role)) return DENIED;
  const inquiry: Inquiry = {
    id: newId("i"),
    organizationId: organization.id,
    ...input,
    status: "new",
    createdAt: new Date().toISOString(),
  };
  store.inquiries.push(inquiry);
  log({ actorId: user.id, actorName: user.name, action: "registrerade förfrågan", entityType: "inquiry", entityId: inquiry.id, href: `/inquiries` }, organization.id);
  refresh();
  return { ok: true, id: inquiry.id };
}

export async function setInquiryStatus(
  id: string,
  status: InquiryStatus
): Promise<Result> {
  const { user } = await org();
  if (!can.manageCustomers(user.role)) return DENIED;
  const inquiry = store.inquiries.find((i) => i.id === id);
  if (!inquiry) return { ok: false, error: "Saknas" };
  inquiry.status = status;
  refresh();
  return { ok: true };
}

/* ------------------------------ notifications ---------------------------- */
export async function markNotificationRead(id: string): Promise<Result> {
  await org();
  const n = store.notifications.find((x) => x.id === id);
  if (n) n.read = true;
  refresh();
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<Result> {
  const { user } = await org();
  store.notifications
    .filter((n) => !n.userId || n.userId === user.id)
    .forEach((n) => (n.read = true));
  refresh();
  return { ok: true };
}

/* --------------------------------- demo ---------------------------------- */
export async function resetDemoData(): Promise<Result> {
  await org();
  resetStore();
  refresh();
  return { ok: true };
}
