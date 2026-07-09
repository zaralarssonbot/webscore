/* ----------------------------------------------------------------------------
   Webscore Work — domain model
   All business entities are scoped to an organization (multi-tenant).
---------------------------------------------------------------------------- */

export type ID = string;

export type Role = "admin" | "supervisor" | "worker";

export type BadgeColor =
  | "gray"
  | "blue"
  | "violet"
  | "cyan"
  | "amber"
  | "green"
  | "red";

/* ------------------------------ Organization ------------------------------ */
export interface Organization {
  id: ID;
  name: string;
  orgNumber: string;
  industry: string;
  email: string;
  phone: string;
  address: string;
  logoText: string; // initials for the brand mark
  defaultVatRate: number; // e.g. 25
  currency: string; // "SEK"
  paymentTerms: string; // e.g. "30 dagar netto"
  quoteTerms: string;
  quoteNumberPrefix: string; // "OFF-2026-"
  workOrderNumberPrefix: string; // "AO-2026-"
}

export interface User {
  id: ID;
  organizationId: ID;
  name: string;
  email: string;
  role: Role;
  title: string;
  phone: string;
  active: boolean;
  hourlyRate: number; // internal cost / billable default
  color: string; // calendar/avatar accent
}

/* -------------------------------- Customer -------------------------------- */
export type CustomerType = "private" | "company";

export interface CustomerAddress {
  id: ID;
  label: string; // "Fakturaadress" | "Arbetsadress"
  type: "invoice" | "work";
  street: string;
  postalCode: string;
  city: string;
}

export interface Customer {
  id: ID;
  organizationId: ID;
  type: CustomerType;
  name: string;
  companyName?: string;
  orgNumber?: string;
  phone: string;
  email: string;
  addresses: CustomerAddress[];
  notes?: string;
  createdAt: string;
}

/* -------------------------------- Inquiry --------------------------------- */
export type InquiryStatus =
  | "new"
  | "contacted"
  | "visit_booked"
  | "quoting"
  | "converted"
  | "closed";

export interface Inquiry {
  id: ID;
  organizationId: ID;
  customerName: string;
  companyName?: string;
  phone: string;
  email: string;
  address: string;
  workType: string;
  description: string;
  desiredDate?: string;
  source: string; // "Webbformulär" | "Telefon" | "Rekommendation" ...
  ownerId?: ID;
  status: InquiryStatus;
  createdAt: string;
}

/* --------------------------------- Quote ---------------------------------- */
export type QuoteStatus =
  | "draft"
  | "sent"
  | "opened"
  | "change_requested"
  | "approved"
  | "declined"
  | "expired";

export type QuoteLineKind = "labor" | "material" | "other";

export interface QuoteItem {
  id: ID;
  kind: QuoteLineKind;
  description: string;
  quantity: number;
  unit: string; // "tim", "st", "m²", "l", "kr"
  unitPrice: number;
  discountPct: number; // 0-100
  vatRate: number; // 25, 12, 6, 0
}

export interface QuoteApproval {
  id: ID;
  quoteId: ID;
  decision: "approved" | "declined" | "change_requested";
  name: string;
  email: string;
  comment?: string;
  termsAccepted: boolean;
  ipAddress?: string;
  decidedAt: string;
}

export interface Quote {
  id: ID;
  organizationId: ID;
  number: string;
  customerId: ID;
  title: string;
  description: string;
  status: QuoteStatus;
  pricingType: "fixed" | "estimate";
  items: QuoteItem[];
  validUntil: string;
  startDate?: string;
  endDate?: string;
  terms: string;
  paymentTerms: string;
  publicToken: string;
  ownerId: ID;
  createdAt: string;
  sentAt?: string;
  openedAt?: string;
  approvals: QuoteApproval[];
  projectId?: ID; // set once converted
}

/* -------------------------------- Project --------------------------------- */
export type ProjectStatus =
  | "planned"
  | "active"
  | "paused"
  | "waiting"
  | "completed"
  | "invoiced";

export interface Project {
  id: ID;
  organizationId: ID;
  name: string;
  customerId: ID;
  quoteId?: ID;
  address: string;
  managerId: ID;
  memberIds: ID[];
  startDate?: string;
  endDate?: string;
  budget: number;
  laborBudgetHours: number;
  materialBudget: number;
  status: ProjectStatus;
  createdAt: string;
}

/* ------------------------------- Work order ------------------------------- */
export type WorkOrderStatus =
  | "unplanned"
  | "planned"
  | "in_progress"
  | "paused"
  | "waiting_material"
  | "review"
  | "completed"
  | "invoiced";

export type Priority = "low" | "normal" | "high" | "urgent";

export interface ChecklistItem {
  id: ID;
  label: string;
  done: boolean;
}

export interface WorkOrder {
  id: ID;
  organizationId: ID;
  number: string;
  customerId: ID;
  projectId?: ID;
  address: string;
  title: string;
  description: string;
  instructions?: string;
  assigneeIds: ID[];
  supervisorId: ID;
  date?: string; // scheduled day (ISO)
  startTime?: string; // "08:00"
  estimatedEndTime?: string; // "12:00"
  priority: Priority;
  status: WorkOrderStatus;
  checklist: ChecklistItem[];
  createdAt: string;
}

/* ------------------------------ Time entries ------------------------------ */
export type TimeEntryStatus = "running" | "submitted" | "approved" | "rejected";

export interface TimeEntry {
  id: ID;
  organizationId: ID;
  workOrderId: ID;
  userId: ID;
  date: string;
  minutes: number;
  workType: string;
  comment?: string;
  status: TimeEntryStatus;
  startedAt?: string; // ISO when running
}

/* -------------------------------- Materials ------------------------------- */
export interface MaterialEntry {
  id: ID;
  organizationId: ID;
  workOrderId: ID;
  projectId?: ID;
  name: string;
  articleNumber?: string;
  quantity: number;
  unit: string;
  purchasePrice: number; // per unit
  customerPrice: number; // per unit
  supplier?: string;
  comment?: string;
  receiptUrl?: string;
  createdBy: ID;
  createdAt: string;
}

/* ------------------------------ Attachments ------------------------------- */
export type AttachmentCategory =
  | "before"
  | "during"
  | "after"
  | "damage"
  | "deviation"
  | "material"
  | "receipt"
  | "other";

export interface Attachment {
  id: ID;
  organizationId: ID;
  workOrderId?: ID;
  projectId?: ID;
  category: AttachmentCategory;
  url: string; // data URL or storage URL
  fileName: string;
  comment?: string;
  uploadedBy: ID;
  createdAt: string;
}

/* ----------------------------- Change orders ------------------------------ */
export type ChangeOrderStatus =
  | "draft"
  | "sent"
  | "approved"
  | "declined";

export interface ChangeOrder {
  id: ID;
  organizationId: ID;
  workOrderId?: ID;
  projectId: ID;
  description: string;
  reason: string;
  estimatedHours: number;
  price: number;
  status: ChangeOrderStatus;
  publicToken: string;
  decidedBy?: string;
  decidedAt?: string;
  comment?: string;
  createdAt: string;
}

/* ----------------------------- Invoice drafts ----------------------------- */
export type InvoiceDraftStatus = "draft" | "approved" | "exported";

export interface InvoiceDraftItem {
  id: ID;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
}

export interface InvoiceDraft {
  id: ID;
  organizationId: ID;
  number: string;
  customerId: ID;
  projectId?: ID;
  workOrderId?: ID;
  reference: string;
  items: InvoiceDraftItem[];
  status: InvoiceDraftStatus;
  createdAt: string;
}

/* ------------------------------ Notifications ----------------------------- */
export type NotificationKind =
  | "work_order_new"
  | "assignment"
  | "time_changed"
  | "quote_opened"
  | "quote_approved"
  | "quote_declined"
  | "change_order_pending"
  | "work_order_overdue"
  | "time_missing"
  | "work_order_review";

export interface AppNotification {
  id: ID;
  organizationId: ID;
  userId?: ID; // null = whole org
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string;
}

/* ------------------------------ Activity log ------------------------------ */
export interface ActivityLog {
  id: ID;
  organizationId: ID;
  actorId?: ID;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: ID;
  href?: string;
  createdAt: string;
}

/* --------------------------- Derived calculations ------------------------- */
export interface QuoteTotals {
  subtotal: number; // ex moms, after row discounts
  discountTotal: number;
  vatTotal: number;
  total: number; // inkl moms
}
