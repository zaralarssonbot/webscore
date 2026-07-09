import { buildSeed, type SeedData } from "./seed";

/**
 * In-memory, multi-tenant data store for the MVP / demo.
 *
 * This is the single source of truth the app reads and mutates through server
 * actions. It is deliberately isolated behind this module so it can later be
 * swapped for the Supabase data layer (see /supabase migrations) without
 * touching the UI — the query/mutation surface stays the same shape.
 *
 * Persisted on globalThis so it survives Next.js hot-reloads in development.
 */
const globalForStore = globalThis as unknown as { __webscoreStore?: SeedData };

export const store: SeedData =
  globalForStore.__webscoreStore ?? (globalForStore.__webscoreStore = buildSeed());

let idCounter = 1;
/** Generate a reasonably unique id for new records. */
export function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${(idCounter++).toString(36)}`;
}

/** Reset to a fresh seed (used by the demo "reset data" action). */
export function resetStore() {
  globalForStore.__webscoreStore = buildSeed();
  return globalForStore.__webscoreStore;
}
