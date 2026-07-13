/**
 * Open-redirect guard for post-auth `next` targets. Only same-origin app paths
 * are allowed — anything else (absolute URLs, protocol-relative //host, empty)
 * falls back to /app. See M5_SPEC.md §15.1.
 */
export function safeNext(raw: string | null | undefined): string {
  if (!raw) return "/app";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/app";
  return raw;
}
