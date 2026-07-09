import { z } from "zod";

export const customerSchema = z.object({
  type: z.enum(["private", "company"]),
  name: z.string().min(2, "Ange ett namn"),
  companyName: z.string().optional(),
  orgNumber: z.string().optional(),
  phone: z.string().min(4, "Ange ett telefonnummer"),
  email: z.string().email("Ogiltig e-postadress").or(z.literal("")),
  street: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const quoteItemSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(["labor", "material", "other"]),
  description: z.string().min(1, "Beskrivning krävs"),
  quantity: z.coerce.number().min(0),
  unit: z.string().min(1),
  unitPrice: z.coerce.number().min(0),
  discountPct: z.coerce.number().min(0).max(100),
  vatRate: z.coerce.number().min(0).max(100),
});

export const quoteSchema = z.object({
  customerId: z.string().min(1, "Välj en kund"),
  title: z.string().min(2, "Ange en titel"),
  description: z.string().optional().default(""),
  pricingType: z.enum(["fixed", "estimate"]),
  validUntil: z.string().min(1, "Ange giltighetstid"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  terms: z.string().optional().default(""),
  paymentTerms: z.string().optional().default(""),
  items: z.array(quoteItemSchema).min(1, "Lägg till minst en rad"),
});
export type QuoteInput = z.infer<typeof quoteSchema>;

export const approvalSchema = z.object({
  decision: z.enum(["approved", "declined", "change_requested"]),
  name: z.string().min(2, "Ange ditt namn"),
  email: z.string().email("Ogiltig e-postadress"),
  comment: z.string().optional(),
  termsAccepted: z.boolean(),
});

export const workOrderSchema = z.object({
  title: z.string().min(2, "Ange en titel"),
  customerId: z.string().min(1, "Välj en kund"),
  projectId: z.string().optional(),
  address: z.string().min(2, "Ange adress"),
  description: z.string().optional().default(""),
  instructions: z.string().optional(),
  assigneeIds: z.array(z.string()).default([]),
  supervisorId: z.string().min(1),
  date: z.string().optional(),
  startTime: z.string().optional(),
  estimatedEndTime: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
});
export type WorkOrderInput = z.infer<typeof workOrderSchema>;

export const timeSchema = z.object({
  workOrderId: z.string().min(1),
  minutes: z.coerce.number().min(1, "Ange tid"),
  date: z.string().min(1),
  workType: z.string().min(1, "Ange typ av arbete"),
  comment: z.string().optional(),
});

export const materialSchema = z.object({
  workOrderId: z.string().min(1),
  name: z.string().min(1, "Ange materialnamn"),
  articleNumber: z.string().optional(),
  quantity: z.coerce.number().min(0),
  unit: z.string().min(1),
  purchasePrice: z.coerce.number().min(0),
  customerPrice: z.coerce.number().min(0),
  supplier: z.string().optional(),
  comment: z.string().optional(),
});

export const inquirySchema = z.object({
  customerName: z.string().min(2, "Ange kundnamn"),
  companyName: z.string().optional(),
  phone: z.string().optional().default(""),
  email: z.string().email("Ogiltig e-post").or(z.literal("")).default(""),
  address: z.string().optional().default(""),
  workType: z.string().min(1, "Ange typ av arbete"),
  description: z.string().optional().default(""),
  desiredDate: z.string().optional(),
  source: z.string().optional().default("Manuell"),
  ownerId: z.string().optional(),
});

export const changeOrderSchema = z.object({
  projectId: z.string().min(1),
  workOrderId: z.string().optional(),
  description: z.string().min(2, "Beskriv tilläggsarbetet"),
  reason: z.string().optional().default(""),
  estimatedHours: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
});
