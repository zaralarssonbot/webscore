import { describe, it, expect } from "vitest";
import { canonicalDomain } from "../../supabase/functions/_shared/canonical-domain.ts";
import { normalizeDomain } from "@/lib/domain";

// The shared M5 normalizer must produce the SAME key as the frontend
// normalizeDomain (and the frozen analyze-website/save-report inline copies), so
// a domain row, its analysis_cache entry, and its reports always share one key.
describe("canonicalDomain", () => {
  it("strips scheme, www, path, query, and port", () => {
    expect(canonicalDomain("https://www.example.se/path?x=1")).toBe("example.se");
    expect(canonicalDomain("HTTP://Example.SE:8080/")).toBe("example.se");
    expect(canonicalDomain("www.foo.bar.com")).toBe("foo.bar.com");
    expect(canonicalDomain("  Example.se  ")).toBe("example.se");
    expect(canonicalDomain("example.se#frag")).toBe("example.se");
  });

  it("is idempotent", () => {
    const once = canonicalDomain("https://www.Example.se/a/b");
    expect(canonicalDomain(once)).toBe(once);
  });

  it("matches the frontend normalizeDomain for valid domains", () => {
    for (const input of [
      "https://www.hemfrid.se/tjanster",
      "VOLVO.com",
      "http://sub.domain.co.uk:443/x",
      "www.test-site.se",
    ]) {
      expect(canonicalDomain(input)).toBe(normalizeDomain(input));
    }
  });
});
