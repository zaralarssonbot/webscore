// M5 — verify-domain. Server-side proof that the caller controls a domain.
// This is a SECURITY boundary: only server-verified domains may enable
// monitoring (§15.4). Three methods: DNS TXT, homepage meta tag, well-known file.
//
// Flow:
//   POST { domainId, method }            → mints/returns the token + instructions
//   POST { domainId, method, check:true} → performs the check; on success marks
//                                          the domain verified (service role).
// The verified/verified_at/method columns can ONLY be written here (the column
// guard reverts client writes), so a user cannot fake verification.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { json, preflight } from "../_shared/http.ts";
import { serviceClient, getUserId, rateLimit, audit, hashIp } from "../_shared/auth.ts";
import { notify } from "../_shared/notify.ts";
// M6 additive: monitoring is a paid capability (Free plan monitoring='none').
import { resolveEntitlements } from "../_shared/entitlements.ts";

const METHODS = ["dns_txt", "meta_tag", "file"] as const;
type Method = (typeof METHODS)[number];

function mintToken(): string {
  return crypto.randomUUID().replace(/-/g, ""); // 32 hex chars
}

function instructionsFor(method: Method, domain: string, token: string) {
  switch (method) {
    case "dns_txt":
      return { record: `_webscore.${domain}`, type: "TXT", value: `webscore-verify=${token}` };
    case "meta_tag":
      return { tag: `<meta name="webscore-verify" content="${token}">`, place: `https://${domain}/ (homepage <head>)` };
    case "file":
      return { path: `https://${domain}/.well-known/webscore-verify.txt`, content: token };
  }
}

async function checkDnsTxt(domain: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=_webscore.${encodeURIComponent(domain)}&type=TXT`,
      { headers: { accept: "application/dns-json" } });
    if (!res.ok) return false;
    const data = await res.json();
    const answers: Array<{ data?: string }> = data?.Answer ?? [];
    return answers.some((a) => (a.data ?? "").replace(/"/g, "").includes(`webscore-verify=${token}`));
  } catch { return false; }
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "WebscoreVerify/1.0" } });
    if (!res.ok) return null;
    return (await res.text()).slice(0, 200_000);
  } catch { return null; }
}

async function checkMetaTag(domain: string, token: string): Promise<boolean> {
  const html = (await fetchText(`https://${domain}/`)) ?? (await fetchText(`http://${domain}/`));
  if (!html) return false;
  const re = new RegExp(`<meta[^>]+name=["']webscore-verify["'][^>]+content=["']${token}["']`, "i");
  const reSwapped = new RegExp(`<meta[^>]+content=["']${token}["'][^>]+name=["']webscore-verify["']`, "i");
  return re.test(html) || reSwapped.test(html);
}

async function checkFile(domain: string, token: string): Promise<boolean> {
  const txt = (await fetchText(`https://${domain}/.well-known/webscore-verify.txt`))
    ?? (await fetchText(`http://${domain}/.well-known/webscore-verify.txt`));
  return !!txt && txt.trim().includes(token);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const uid = await getUserId(req);
    if (!uid) return json({ error: "unauthorized" }, 401);

    const { domainId, method, check, setMonitoring } = (await req.json()) as
      { domainId?: string; method?: Method; check?: boolean; setMonitoring?: boolean };
    if (!domainId) return json({ error: "domainId is required" }, 400);

    const svc = serviceClient();

    // ── Monitoring toggle (the "result gate"). monitoring_enabled is a
    // server-owned column; only this service-role path may set it, and only for
    // an already-verified domain. §7.2, §15.6.
    if (typeof setMonitoring === "boolean") {
      const { data: dom } = await svc.from("domains")
        .select("id, verified").eq("id", domainId).eq("user_id", uid).maybeSingle();
      if (!dom) return json({ error: "not_found" }, 404);
      if (setMonitoring) {
        if (!dom.verified) return json({ error: "not_verified" }, 409);
        // M6: only plans with monitoring !== 'none' may enable it.
        const ent = await resolveEntitlements(svc, uid);
        if (ent.limits.monitoring === "none") return json({ error: "not_in_plan", metric: "monitoring" }, 402);
      }
      await svc.from("domains").update({ monitoring_enabled: setMonitoring })
        .eq("id", domainId).eq("user_id", uid);
      return json({ ok: true, monitoring_enabled: setMonitoring });
    }

    if (!method || !METHODS.includes(method)) {
      return json({ error: "a valid method is required" }, 400);
    }

    if (!(await rateLimit(svc, `user:${uid}`, "verify", 10, 3_600_000))) {
      return json({ error: "rate_limited" }, 429);
    }

    // Ownership check via service role (bypasses RLS, but we filter by user_id).
    const { data: domain, error: dErr } = await svc.from("domains")
      .select("id, user_id, normalized_domain, verification_token, verified")
      .eq("id", domainId).eq("user_id", uid).maybeSingle();
    if (dErr) throw dErr;
    if (!domain) return json({ error: "not_found" }, 404);

    // Ensure a token exists and the chosen method is recorded.
    let token = domain.verification_token as string | null;
    if (!token) {
      token = mintToken();
      await svc.from("domains").update({ verification_token: token, verification_method: method })
        .eq("id", domainId);
    } else {
      await svc.from("domains").update({ verification_method: method }).eq("id", domainId);
    }

    const instructions = instructionsFor(method, domain.normalized_domain, token);

    if (!check) {
      return json({ ok: true, verified: !!domain.verified, method, token, instructions });
    }

    // Perform the verification.
    let ok = false;
    if (method === "dns_txt") ok = await checkDnsTxt(domain.normalized_domain, token);
    else if (method === "meta_tag") ok = await checkMetaTag(domain.normalized_domain, token);
    else ok = await checkFile(domain.normalized_domain, token);

    if (!ok) {
      await audit(svc, uid, "domain_verify_failed", domain.normalized_domain, await hashIp(req), { method });
      return json({ ok: false, verified: false, method, token, instructions, error: "verification_failed" });
    }

    await svc.from("domains").update({
      verified: true, verified_at: new Date().toISOString(), verification_method: method,
    }).eq("id", domainId).eq("user_id", uid);

    await notify(svc, uid, "domain_verified",
      `Domänen ${domain.normalized_domain} är verifierad`,
      "Du kan nu aktivera automatisk övervakning.", { domain_id: domainId });
    await audit(svc, uid, "domain_verified", domain.normalized_domain, await hashIp(req), { method });

    return json({ ok: true, verified: true, method });
  } catch (e) {
    console.error("verify-domain error:", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
