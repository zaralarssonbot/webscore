-- Add new columns to existing leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS domain TEXT,
  ADD COLUMN IF NOT EXISTS total_score INTEGER,
  ADD COLUMN IF NOT EXISTS visibility_gap INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_loss TEXT,
  ADD COLUMN IF NOT EXISTS analysis_summary TEXT,
  ADD COLUMN IF NOT EXISTS biggest_problem TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads (status);

-- Create index on domain for lookups
CREATE INDEX IF NOT EXISTS idx_leads_domain ON public.leads (domain);

-- Add trigger for updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();