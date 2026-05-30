import { z } from "zod";

const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

export const domainSchema = z
  .string()
  .trim()
  .min(1, "Vänligen ange en domän")
  .max(253, "Domänen är för lång")
  .transform((val) => {
    // Strip protocol
    let domain = val.replace(/^https?:\/\//, "");
    // Strip www.
    domain = domain.replace(/^www\./, "");
    // Strip trailing slash and path
    domain = domain.split("/")[0];
    // Strip port
    domain = domain.split(":")[0];
    // Lowercase
    domain = domain.toLowerCase().trim();
    return domain;
  })
  .refine((val) => domainRegex.test(val), {
    message: "Vänligen ange en giltig domän (t.ex. dinsida.se)",
  });

export function normalizeDomain(input: string): string {
  return domainSchema.parse(input);
}

export function validateDomain(input: string): { valid: boolean; error?: string; normalized?: string } {
  const result = domainSchema.safeParse(input);
  if (result.success) {
    return { valid: true, normalized: result.data };
  }
  return { valid: false, error: result.error.errors[0]?.message };
}
