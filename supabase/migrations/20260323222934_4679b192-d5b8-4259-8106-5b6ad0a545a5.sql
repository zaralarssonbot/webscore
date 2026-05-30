
-- Create timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create scan status enum
CREATE TYPE public.scan_status AS ENUM ('queued', 'crawling', 'auditing', 'ai_analysis', 'complete', 'failed');

-- Scans table
CREATE TABLE public.scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL,
  normalized_domain TEXT NOT NULL,
  status scan_status NOT NULL DEFAULT 'queued',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create scans" ON public.scans
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view scans" ON public.scans
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update scans" ON public.scans
  FOR UPDATE USING (true);

CREATE TRIGGER update_scans_updated_at
  BEFORE UPDATE ON public.scans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pages table
CREATE TABLE public.pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  meta_description TEXT,
  h1 TEXT,
  text_content TEXT,
  desktop_screenshot_url TEXT,
  mobile_screenshot_url TEXT,
  html_snapshot TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pages" ON public.pages
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert pages" ON public.pages
  FOR INSERT WITH CHECK (true);

-- Audits table
CREATE TABLE public.audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  performance_score NUMERIC,
  seo_score NUMERIC,
  accessibility_score NUMERIC,
  best_practices_score NUMERIC,
  raw_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view audits" ON public.audits
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert audits" ON public.audits
  FOR INSERT WITH CHECK (true);

-- AI Reports table
CREATE TABLE public.ai_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  industry TEXT,
  industry_confidence NUMERIC,
  business_summary TEXT,
  overall_summary TEXT,
  final_score INTEGER NOT NULL,
  weaknesses_json JSONB NOT NULL DEFAULT '[]',
  strengths_json JSONB NOT NULL DEFAULT '[]',
  biggest_opportunity TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ai_reports" ON public.ai_reports
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert ai_reports" ON public.ai_reports
  FOR INSERT WITH CHECK (true);

-- Leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert leads" ON public.leads
  FOR INSERT WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_scans_normalized_domain ON public.scans(normalized_domain);
CREATE INDEX idx_scans_status ON public.scans(status);
CREATE INDEX idx_pages_scan_id ON public.pages(scan_id);
CREATE INDEX idx_audits_scan_id ON public.audits(scan_id);
CREATE INDEX idx_ai_reports_scan_id ON public.ai_reports(scan_id);
CREATE INDEX idx_leads_scan_id ON public.leads(scan_id);
