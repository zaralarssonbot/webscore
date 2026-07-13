import { describe, it, expect } from "vitest";
import { safeNext } from "@/lib/account/redirect";

describe("safeNext (open-redirect guard)", () => {
  it("defaults to /app for empty/nullish", () => {
    expect(safeNext(null)).toBe("/app");
    expect(safeNext(undefined)).toBe("/app");
    expect(safeNext("")).toBe("/app");
  });

  it("allows same-origin app paths", () => {
    expect(safeNext("/app")).toBe("/app");
    expect(safeNext("/app/domains/123")).toBe("/app/domains/123");
    expect(safeNext("/app/settings")).toBe("/app/settings");
  });

  it("rejects absolute URLs", () => {
    expect(safeNext("https://evil.com")).toBe("/app");
    expect(safeNext("http://evil.com/app")).toBe("/app");
  });

  it("rejects protocol-relative //host", () => {
    expect(safeNext("//evil.com")).toBe("/app");
    expect(safeNext("//evil.com/app")).toBe("/app");
  });

  it("rejects non-path values", () => {
    expect(safeNext("javascript:alert(1)")).toBe("/app");
    expect(safeNext("app/domains")).toBe("/app");
  });
});
