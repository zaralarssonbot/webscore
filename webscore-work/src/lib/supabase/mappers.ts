/**
 * Row mappers: Postgres (snake_case) → domain model (camelCase, src/lib/types).
 *
 * Kept in one place so every ported vertical converts rows identically. As more
 * verticals move to Supabase, add their mappers here next to the customer ones.
 */
import type {
  Customer,
  CustomerAddress,
  Organization,
  Role,
  User,
} from "../types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function mapOrganization(r: any): Organization {
  return {
    id: r.id,
    name: r.name,
    orgNumber: r.org_number,
    industry: r.industry ?? "",
    email: r.email ?? "",
    phone: r.phone ?? "",
    address: r.address ?? "",
    logoText: r.logo_text ?? "",
    defaultVatRate: Number(r.default_vat_rate ?? 25),
    currency: r.currency ?? "SEK",
    paymentTerms: r.payment_terms ?? "",
    quoteTerms: r.quote_terms ?? "",
    quoteNumberPrefix: r.quote_number_prefix ?? "OFF-",
    workOrderNumberPrefix: r.work_order_number_prefix ?? "AO-",
  };
}

export function mapUser(r: any): User {
  return {
    id: r.id,
    organizationId: r.organization_id,
    name: r.name,
    email: r.email,
    role: r.role as Role,
    title: r.title ?? "",
    phone: r.phone ?? "",
    active: r.active ?? true,
    hourlyRate: Number(r.hourly_rate ?? 0),
    color: r.color ?? "#6b7280",
  };
}

export function mapCustomerAddress(r: any): CustomerAddress {
  return {
    id: r.id,
    label: r.label ?? "",
    type: r.type,
    street: r.street ?? "",
    postalCode: r.postal_code ?? "",
    city: r.city ?? "",
  };
}

export function mapCustomer(r: any): Customer {
  return {
    id: r.id,
    organizationId: r.organization_id,
    type: r.type,
    name: r.name,
    companyName: r.company_name ?? undefined,
    orgNumber: r.org_number ?? undefined,
    phone: r.phone ?? "",
    email: r.email ?? "",
    notes: r.notes ?? undefined,
    addresses: Array.isArray(r.customer_addresses)
      ? r.customer_addresses.map(mapCustomerAddress)
      : [],
    createdAt: r.created_at,
  };
}
