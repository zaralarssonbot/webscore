// M5 account domain models. The generated Supabase types (types.ts) deliberately
// do not carry the M2+ tables (same convention as `reports`), so account services
// cast query results to these hand-authored interfaces at the boundary.

export type VerificationMethod = "dns_txt" | "meta_tag" | "file";

export type NotificationType =
  | "analysis_complete"
  | "score_changed"
  | "pdf_ready"
  | "domain_verified"
  | "weekly_digest";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  company_org_number: string | null;
  locale: "sv" | "en";
  avatar_url: string | null;
  marketing_opt_in: boolean;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  notify_analysis_complete: boolean;
  notify_score_changed: boolean;
  notify_pdf_ready: boolean;
  notify_weekly_digest: boolean;
  score_change_threshold: number;
  theme_pref: "system" | "dark" | "light";
}

export interface Domain {
  id: string;
  user_id: string;
  normalized_domain: string;
  display_name: string | null;
  is_primary: boolean;
  is_favorite: boolean;
  is_archived: boolean;
  verified: boolean;
  verification_method: VerificationMethod | null;
  verification_token: string | null;
  verified_at: string | null;
  monitoring_enabled: boolean;
  last_analyzed_at: string | null;
  latest_report_id: string | null;
  latest_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

/** Lightweight report row for history/trend lists — never includes report_data. */
export interface ReportListRow {
  id: string;
  normalized_domain: string;
  final_score: number;
  category_scores: Record<string, number>;
  status: "complete" | "partial";
  measured_at: string | null;
  created_at: string;
  domain_id: string | null;
  title: string | null;
  pdf_path?: string | null;
}

export const CATEGORY_KEYS = ["performance", "seo", "conversion", "trust", "security"] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

/** Product-facing labels for the score categories (Swedish). */
export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  performance: "Prestanda",
  seo: "SEO",
  conversion: "UX / Konvertering",
  trust: "Förtroende",
  security: "Säkerhet",
};
