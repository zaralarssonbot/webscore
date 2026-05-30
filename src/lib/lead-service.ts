import { supabase } from "@/integrations/supabase/client";

/**
 * Lead status flow:
 * new → analysis_sent → meeting_booked | follow_up_needed → warm | cold
 */
export type LeadStatus =
  | "new"
  | "analysis_sent"
  | "meeting_booked"
  | "follow_up_needed"
  | "warm"
  | "cold";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Ny lead",
  analysis_sent: "Analys skickad",
  meeting_booked: "Möte bokat",
  follow_up_needed: "Uppföljning behövs",
  warm: "Varm lead",
  cold: "Kall lead",
};

/** Update a lead's status */
export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  const { error } = await supabase
    .from("leads")
    .update({ lead_status: status })
    .eq("id", leadId);
  if (error) throw new Error(`Failed to update lead status: ${error.message}`);
}

/** Mark that a lead clicked the booking CTA */
export async function markBookingClicked(leadId: string, bookingUrl?: string) {
  const { error } = await supabase
    .from("leads")
    .update({
      lead_status: "meeting_booked",
      booking_clicked_at: new Date().toISOString(),
      booking_url: bookingUrl || null,
    })
    .eq("id", leadId);
  if (error) throw new Error(`Failed to mark booking: ${error.message}`);
}

/** Mark a lead as "analysis_sent" after email report */
export async function markAnalysisSent(leadId: string) {
  await updateLeadStatus(leadId, "analysis_sent");
}

/** Schedule a follow-up for a lead */
export async function scheduleFollowUp(leadId: string, followUpAt: Date) {
  const { error } = await supabase
    .from("leads")
    .update({
      lead_status: "follow_up_needed",
      follow_up_at: followUpAt.toISOString(),
    })
    .eq("id", leadId);
  if (error) throw new Error(`Failed to schedule follow-up: ${error.message}`);
}

/** Find lead by scan_id */
export async function findLeadByScanId(scanId: string) {
  const { data, error } = await supabase
    .from("leads")
    .select("id, lead_status, email, booking_clicked_at")
    .eq("scan_id", scanId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to find lead: ${error.message}`);
  return data;
}

/**
 * Auto-schedule follow-up after analysis.
 * Called after lead is created — schedules follow-up 24h later if no booking.
 */
export async function autoScheduleFollowUp(scanId: string) {
  const lead = await findLeadByScanId(scanId);
  if (!lead || lead.booking_clicked_at) return;

  const followUpAt = new Date();
  followUpAt.setHours(followUpAt.getHours() + 24);
  await scheduleFollowUp(lead.id, followUpAt);
}
