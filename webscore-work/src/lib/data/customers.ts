import "server-only";
import { isSupabaseEnabled } from "../supabase/config";
import { createSupabaseServerClient } from "../supabase/server";
import { mapCustomer } from "../supabase/mappers";
import { store } from "../db/store";
import type { Customer, CustomerType } from "../types";

/**
 * Customers — the canonical example of a vertical ported to the dual-mode data
 * layer. Every other entity should follow this exact shape when ported:
 *
 *   • DEMO mode     → reads/writes the in-memory store (src/lib/db), scoped by
 *     organization_id, so the rest of the not-yet-ported app stays consistent.
 *   • SUPABASE mode → reads/writes Postgres through the request-scoped client;
 *     RLS (0002/0003) enforces tenant isolation, so no manual org filter is
 *     needed on the query — but we still pass organization_id on writes so the
 *     WITH CHECK predicate passes.
 *
 * Reads are async (Supabase is async); all callers are Server Components, so
 * awaiting is free. snake_case → camelCase mapping lives in supabase/mappers.
 */

const DEMO_ORG = () => store.organization.id;

/* --------------------------------- reads --------------------------------- */
export async function listCustomers(): Promise<Customer[]> {
  if (isSupabaseEnabled()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("customers")
      .select("*, customer_addresses(*)")
      .order("name", { ascending: true });
    if (error) throw new Error(`Kunde inte hämta kunder: ${error.message}`);
    return (data ?? []).map(mapCustomer);
  }
  return store.customers
    .filter((c) => c.organizationId === DEMO_ORG())
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  if (isSupabaseEnabled()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("customers")
      .select("*, customer_addresses(*)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`Kunde inte hämta kund: ${error.message}`);
    return data ? mapCustomer(data) : undefined;
  }
  return store.customers.find(
    (c) => c.id === id && c.organizationId === DEMO_ORG()
  );
}

/* -------------------------------- writes --------------------------------- */
export interface CustomerWrite {
  id?: string;
  type: CustomerType;
  name: string;
  companyName?: string;
  orgNumber?: string;
  phone: string;
  email: string;
  notes?: string;
  street?: string;
  postalCode?: string;
  city?: string;
}

/**
 * Insert or update a customer (+ its primary address) in Supabase. Returns the
 * row id. Only used in Supabase mode; the demo path stays in actions.ts so the
 * in-memory mutation logic is untouched.
 */
export async function upsertCustomerDb(
  orgId: string,
  input: CustomerWrite
): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const row = {
    organization_id: orgId,
    type: input.type,
    name: input.name,
    company_name: input.companyName ?? null,
    org_number: input.orgNumber ?? null,
    phone: input.phone ?? "",
    email: input.email ?? "",
    notes: input.notes ?? null,
  };

  let customerId = input.id;
  if (customerId) {
    const { error } = await supabase
      .from("customers")
      .update(row)
      .eq("id", customerId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase
      .from("customers")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    customerId = data.id as string;
  }

  // Upsert the primary address only when one was provided.
  if (input.street || input.postalCode || input.city) {
    const addr = {
      organization_id: orgId,
      customer_id: customerId,
      label: input.type === "company" ? "Fakturaadress" : "Hemadress",
      type: "invoice" as const,
      street: input.street ?? "",
      postal_code: input.postalCode ?? "",
      city: input.city ?? "",
    };
    // Replace existing primary address for simplicity (one-address model).
    await supabase.from("customer_addresses").delete().eq("customer_id", customerId);
    const { error } = await supabase.from("customer_addresses").insert(addr);
    if (error) throw new Error(error.message);
  }

  return customerId;
}
