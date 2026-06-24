import type { ScanResult } from "./scan-service";

export interface EmailReportData {
  domain: string;
  score: number;
  summary: string;
  biggestProblem?: string;
  industry?: string;
  categoryScores: ScanResult["categoryScores"];
  competitors?: { name: string }[];
  businessImpact?: string[];
}

/**
 * Generate a premium Swedish HTML email summary.
 * Currently returns HTML string for mock/preview.
 * Ready to plug into a real email service (e.g. Resend or SendGrid).
 */
export function generateEmailReport(data: EmailReportData): string {
  const scoreColor = data.score >= 70 ? "#10b981" : data.score >= 45 ? "#f59e0b" : "#ef4444";

  const competitorRows = (data.competitors ?? [])
    .map(
      (c) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #1e1e2e;">${c.name}</td></tr>`
    )
    .join("");

  const impactItems = (data.businessImpact ?? [])
    .map((i) => `<li style="margin-bottom:6px;">${i}</li>`)
    .join("");

  return `
<!DOCTYPE html>
<html lang="sv">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;color:#e0e0e0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#12121a;border-radius:16px;border:1px solid rgba(255,255,255,0.06);overflow:hidden;">

<!-- Header -->
<tr><td style="padding:32px 40px 24px;text-align:center;background:linear-gradient(135deg,rgba(0,220,200,0.08),rgba(160,50,220,0.06));">
  <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">Din Webscore-analys</h1>
  <p style="margin:8px 0 0;color:#a0a0b0;font-size:14px;">${data.domain}</p>
</td></tr>

<!-- Score -->
<tr><td style="padding:32px 40px;text-align:center;">
  <div style="display:inline-block;width:100px;height:100px;border-radius:50%;border:4px solid ${scoreColor};line-height:100px;font-size:36px;font-weight:800;color:${scoreColor};">${data.score}</div>
  <p style="margin:16px 0 0;font-size:14px;color:#c0c0d0;line-height:1.6;">${data.summary}</p>
</td></tr>

<!-- Biggest Problem -->
${data.biggestProblem ? `
<tr><td style="padding:0 40px 24px;">
  <div style="background:#1a1a2e;border-radius:12px;padding:20px;border-left:4px solid #ef4444;">
    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#ef4444;">Största problemet</p>
    <p style="margin:0;font-size:14px;color:#e0e0e0;line-height:1.5;">${data.biggestProblem}</p>
  </div>
</td></tr>` : ""}

<!-- Category Scores -->
<tr><td style="padding:0 40px 24px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:8px 0;color:#a0a0b0;font-size:13px;">SEO</td>
      <td style="padding:8px 0;text-align:right;font-weight:700;color:#ffffff;">${data.categoryScores.seo}/100</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#a0a0b0;font-size:13px;">Konvertering</td>
      <td style="padding:8px 0;text-align:right;font-weight:700;color:#ffffff;">${data.categoryScores.conversion}/100</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#a0a0b0;font-size:13px;">Trovärdighet</td>
      <td style="padding:8px 0;text-align:right;font-weight:700;color:#ffffff;">${data.categoryScores.trust}/100</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#a0a0b0;font-size:13px;">Prestanda</td>
      <td style="padding:8px 0;text-align:right;font-weight:700;color:#ffffff;">${data.categoryScores.performance}/100</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#a0a0b0;font-size:13px;">Säkerhet</td>
      <td style="padding:8px 0;text-align:right;font-weight:700;color:#ffffff;">${data.categoryScores.security}/100</td>
    </tr>
  </table>
</td></tr>

<!-- Competitors -->
${competitorRows ? `
<tr><td style="padding:0 40px 24px;">
  <p style="margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#a0a0b0;">Konkurrenter i ditt område</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:8px;overflow:hidden;">
    ${competitorRows}
  </table>
</td></tr>` : ""}

<!-- Business Impact -->
${impactItems ? `
<tr><td style="padding:0 40px 24px;">
  <p style="margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#a0a0b0;">Affärspåverkan</p>
  <ul style="margin:0;padding-left:18px;font-size:14px;color:#c0c0d0;line-height:1.7;">${impactItems}</ul>
</td></tr>` : ""}

<!-- CTA -->
<tr><td style="padding:24px 40px 40px;text-align:center;">
  <p style="margin:0 0 16px;font-size:15px;color:#e0e0e0;">Vill du veta exakt hur du fixar det här?</p>
  <a href="https://webscore.se" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#2DE2C8,#36A0F0,#8B5CF6);color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;border-radius:12px;">Boka en gratis 20-minuters genomgång</a>
  <p style="margin:16px 0 0;font-size:12px;color:#707080;">Kostnadsfritt · Inga förpliktelser · Personlig rådgivning</p>
</td></tr>

</table>
</td></tr></table>
</body>
</html>`;
}
