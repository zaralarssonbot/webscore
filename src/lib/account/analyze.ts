import { createScan, runAnalysis } from "@/lib/scan-service";
import { saveReport } from "@/lib/report-service";

/**
 * Run a full analysis for a domain and persist the report. When the caller is
 * signed in, save-report attaches ownership server-side (from the JWT) and links
 * it to the user's domain — no client-supplied user id involved. Returns the new
 * report id (or null on failure; never throws into the UI).
 */
export async function analyzeAndSave(domain: string): Promise<string | null> {
  try {
    const scanId = await createScan(domain);
    const result = await runAnalysis(scanId, domain);
    return await saveReport(domain, result);
  } catch (e) {
    console.error("[analyze] analyzeAndSave failed:", e);
    return null;
  }
}
