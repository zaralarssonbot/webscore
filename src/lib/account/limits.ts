// M5 client-side constants + the accounts feature flag.

/** Free-tier cap on ACTIVE (non-archived) domains. Mirrors the DB trigger. */
export const MAX_DOMAINS_PER_USER = 25;

export const DEFAULT_SCORE_CHANGE_THRESHOLD = 3;

export const HISTORY_PAGE_SIZE = 20;

/**
 * Accounts ship dark until the M5 DoD gates pass. When the flag is off, all
 * account entry points (nav links, save-to-account CTA) are hidden and the
 * public M1–M4 flows render exactly as before. Routes remain registered so the
 * feature can be verified via direct URLs during the dark-launch window.
 */
export function accountsEnabled(): boolean {
  return import.meta.env.VITE_ACCOUNTS_ENABLED === "true";
}

/**
 * M6 billing ships dark until its DoD gates pass. When off, all billing entry
 * points (pricing/upgrade CTAs, /app/billing nav) are hidden and no plan gating
 * is surfaced in the UI. Requires accounts to be enabled to be meaningful.
 */
export function billingEnabled(): boolean {
  return import.meta.env.VITE_BILLING_ENABLED === "true";
}
