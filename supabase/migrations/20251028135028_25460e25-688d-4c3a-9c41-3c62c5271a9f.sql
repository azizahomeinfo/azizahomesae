-- Create table for client submissions
CREATE TABLE public.client_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.client_submissions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert (public form submissions)
CREATE POLICY "Anyone can submit their information"
ON public.client_submissions
FOR INSERT
TO anon
WITH CHECK (true);

-- Create policy for viewing submissions (for admin/authenticated users only)
CREATE POLICY "Authenticated users can view all submissions"
ON public.client_submissions
FOR SELECT
TO authenticated
USING (true);

-- Create index for faster queries
CREATE INDEX idx_client_submissions_created_at ON public.client_submissions(created_at DESC);
CREATE INDEX idx_client_submissions_email ON public.client_submissions(email);