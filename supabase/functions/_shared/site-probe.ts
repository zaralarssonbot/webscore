// M7 — additive monitoring probes. NOT part of the frozen analyze-website; the
// worker calls these after saving the report to capture SSL expiry, robots.txt
// presence, canonical, and homepage reachability. All fail-soft (null/false on
// error) so a probe hiccup never crashes a run or fabricates a change.
// See M7_SPEC.md §9.1.

import * as tls from "node:tls";

/** Certificate notAfter (ISO) via a TLS handshake, or null on any failure. */
export function sslNotAfter(domain: string, timeoutMs = 8000): Promise<string | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: string | null) => { if (!done) { done = true; resolve(v); } };
    try {
      const socket = tls.connect({ host: domain, port: 443, servername: domain, timeout: timeoutMs }, () => {
        try {
          const cert = socket.getPeerCertificate();
          const validTo = cert && (cert as { valid_to?: string }).valid_to;
          socket.end();
          finish(validTo ? new Date(validTo).toISOString() : null);
        } catch { finish(null); }
      });
      socket.on("error", () => finish(null));
      socket.on("timeout", () => { try { socket.destroy(); } catch { /* noop */ } finish(null); });
    } catch { finish(null); }
  });
}

/** Homepage reachability + canonical href + robots.txt presence. Fail-soft. */
export async function probeSite(domain: string): Promise<{ reachable: boolean; robots: boolean; canonical: string | null }> {
  let reachable = false;
  let canonical: string | null = null;
  try {
    const r = await fetch(`https://${domain}/`, {
      redirect: "follow",
      headers: { "user-agent": "WebscoreMonitor/1.0" },
      signal: AbortSignal.timeout(12000),
    });
    reachable = r.ok;
    if (r.ok) {
      const html = (await r.text()).slice(0, 300_000);
      const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
        ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
      canonical = m ? m[1] : null;
    }
  } catch { reachable = false; }

  let robots = false;
  try {
    const rr = await fetch(`https://${domain}/robots.txt`, { signal: AbortSignal.timeout(8000) });
    robots = rr.ok && rr.status < 400;
  } catch { robots = false; }

  return { reachable, robots, canonical };
}
