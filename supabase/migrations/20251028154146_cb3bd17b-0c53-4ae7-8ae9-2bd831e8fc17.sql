-- Create intake_forms table to store client inquiries
CREATE TABLE public.intake_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contact Information
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  
  -- Client Details
  client_type TEXT NOT NULL, -- 'end_user', 'holiday_home', 'investor', 'expat'
  property_type TEXT, -- 'apartment', 'villa', 'penthouse', 'townhouse', 'commercial'
  property_size TEXT, -- 'studio', 'one_bed', 'two_bed', 'three_bed_plus', 'large_space'
  
  -- Project Details
  budget_range TEXT NOT NULL, -- 'under_50k', '50k_100k', '100k_200k', '200k_plus', 'flexible'
  timeline TEXT NOT NULL, -- 'urgent', '1_3_months', '3_6_months', 'flexible'
  
  -- Design Preferences
  design_style TEXT[], -- Array: 'japandi', 'wabi_sabi', 'minimalist', 'scandinavian', 'modern', 'traditional'
  color_palette TEXT[], -- Array: 'neutral', 'warm', 'cool', 'earth_tones', 'monochrome', 'bold_accents'
  
  -- Additional Details
  spaces_to_design TEXT[], -- Array: 'living_room', 'bedroom', 'kitchen', 'bathroom', 'dining', 'office', 'entire_home'
  special_requirements TEXT,
  inspiration_links TEXT,
  
  -- Status
  status TEXT DEFAULT 'new' -- 'new', 'contacted', 'quoted', 'in_progress', 'completed'
);

-- Enable RLS
ALTER TABLE public.intake_forms ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit forms
CREATE POLICY "Anyone can submit intake forms"
ON public.intake_forms
FOR INSERT
WITH CHECK (true);

-- Users can view their own submissions
CREATE POLICY "Users can view own intake forms"
ON public.intake_forms
FOR SELECT
USING (
  CASE
    WHEN auth.uid() IS NOT NULL THEN auth.uid() = user_id
    ELSE false
  END
);

-- Admins can view all forms
CREATE POLICY "Admins can view all intake forms"
ON public.intake_forms
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update form status
CREATE POLICY "Admins can update intake forms"
ON public.intake_forms
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_intake_forms_created_at ON public.intake_forms(created_at DESC);
CREATE INDEX idx_intake_forms_status ON public.intake_forms(status);
CREATE INDEX idx_intake_forms_client_type ON public.intake_forms(client_type);