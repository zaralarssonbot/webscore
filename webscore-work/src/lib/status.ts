import type {
  BadgeColor,
  ChangeOrderStatus,
  InquiryStatus,
  InvoiceDraftStatus,
  Priority,
  ProjectStatus,
  QuoteStatus,
  Role,
  TimeEntryStatus,
  WorkOrderStatus,
} from "./types";

export interface StatusMeta {
  label: string;
  color: BadgeColor;
}

/** Status color philosophy (subtle, consistent):
 *  gray = draft/not started · blue = planned/sent · violet = awaiting action
 *  amber = paused/overdue · green = approved/done · red = declined/problem  */

export const inquiryStatus: Record<InquiryStatus, StatusMeta> = {
  new: { label: "Ny", color: "blue" },
  contacted: { label: "Kontaktad", color: "violet" },
  visit_booked: { label: "Besök bokat", color: "violet" },
  quoting: { label: "Offert skapas", color: "amber" },
  converted: { label: "Konverterad", color: "green" },
  closed: { label: "Avslutad", color: "gray" },
};

export const quoteStatus: Record<QuoteStatus, StatusMeta> = {
  draft: { label: "Utkast", color: "gray" },
  sent: { label: "Skickad", color: "blue" },
  opened: { label: "Öppnad", color: "violet" },
  change_requested: { label: "Ändring begärd", color: "amber" },
  approved: { label: "Godkänd", color: "green" },
  declined: { label: "Avböjd", color: "red" },
  expired: { label: "Utgången", color: "gray" },
};

export const projectStatus: Record<ProjectStatus, StatusMeta> = {
  planned: { label: "Planerat", color: "blue" },
  active: { label: "Pågående", color: "cyan" },
  paused: { label: "Pausat", color: "amber" },
  waiting: { label: "Väntar", color: "amber" },
  completed: { label: "Slutfört", color: "green" },
  invoiced: { label: "Fakturerat", color: "gray" },
};

export const workOrderStatus: Record<WorkOrderStatus, StatusMeta> = {
  unplanned: { label: "Ej planerad", color: "gray" },
  planned: { label: "Planerad", color: "blue" },
  in_progress: { label: "Pågående", color: "cyan" },
  paused: { label: "Pausad", color: "amber" },
  waiting_material: { label: "Väntar på material", color: "amber" },
  review: { label: "Klar för kontroll", color: "violet" },
  completed: { label: "Slutförd", color: "green" },
  invoiced: { label: "Fakturerad", color: "gray" },
};

export const timeEntryStatus: Record<TimeEntryStatus, StatusMeta> = {
  running: { label: "Pågår", color: "cyan" },
  submitted: { label: "Inskickad", color: "blue" },
  approved: { label: "Godkänd", color: "green" },
  rejected: { label: "Avvisad", color: "red" },
};

export const changeOrderStatus: Record<ChangeOrderStatus, StatusMeta> = {
  draft: { label: "Utkast", color: "gray" },
  sent: { label: "Skickad", color: "blue" },
  approved: { label: "Godkänd", color: "green" },
  declined: { label: "Avböjd", color: "red" },
};

export const invoiceDraftStatus: Record<InvoiceDraftStatus, StatusMeta> = {
  draft: { label: "Utkast", color: "gray" },
  approved: { label: "Godkänd", color: "blue" },
  exported: { label: "Överförd", color: "green" },
};

export const priorityMeta: Record<Priority, StatusMeta> = {
  low: { label: "Låg", color: "gray" },
  normal: { label: "Normal", color: "blue" },
  high: { label: "Hög", color: "amber" },
  urgent: { label: "Brådskande", color: "red" },
};

export const roleMeta: Record<Role, { label: string }> = {
  admin: { label: "Administratör" },
  supervisor: { label: "Arbetsledare" },
  worker: { label: "Medarbetare" },
};

export const attachmentCategoryLabels: Record<string, string> = {
  before: "Före arbete",
  during: "Under arbete",
  after: "Efter arbete",
  damage: "Skada",
  deviation: "Avvikelse",
  material: "Material",
  receipt: "Kvitto",
  other: "Övrigt",
};

/** Ordered columns for kanban boards. */
export const inquiryStages: InquiryStatus[] = [
  "new",
  "contacted",
  "visit_booked",
  "quoting",
  "converted",
  "closed",
];

export const quoteStages: QuoteStatus[] = [
  "draft",
  "sent",
  "opened",
  "change_requested",
  "approved",
  "declined",
];

export const workOrderStages: WorkOrderStatus[] = [
  "unplanned",
  "planned",
  "in_progress",
  "waiting_material",
  "review",
  "completed",
];
