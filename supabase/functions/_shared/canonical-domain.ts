// M5 shared canonical-domain normalizer.
//
// Byte-for-byte identical logic to canonicalDomain() inlined in the frozen
// analyze-website and save-report functions. It is duplicated here (not
// extracted from those functions) so M5 code shares ONE normalization with the
// frozen pipeline WITHOUT modifying any frozen file. The domain row, its cache
// entry, and its reports therefore always share one key. Do not diverge this
// from the frozen copies — a regression test asserts parity.

export function canonicalDomain(input: string): string {
  return input.trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/^www\./, "")
    .replace(/[/?#].*$/, "").replace(/:\d+$/, "");
}
