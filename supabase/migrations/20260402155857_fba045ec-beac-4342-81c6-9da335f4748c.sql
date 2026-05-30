-- Add booking and follow-up columns to leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lead_status TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS booking_clicked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS booking_url TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS follow_up_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Index on lead_status for filtering
CREATE INDEX IF NOT EXISTS idx_leads_lead_status ON public.leads (lead_status);

-- Index on follow_up_at for scheduling queries
CREATE INDEX IF NOT EXISTS idx_leads_follow_up_at ON public.leads (follow_up_at) WHERE follow_up_at IS NOT NULL;

-- Allow public to update leads (for status transitions from frontend)
CREATE POLICY "Anyone can update leads"
  ON public.leads
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow public to select leads (needed to find lead by scan_id)
CREATE POLICY "Anyone can view leads"
  ON public.leads
  FOR SELECT
  USING (true);