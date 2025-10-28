-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Only admins can manage roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drop existing overly permissive policies on client_submissions
DROP POLICY IF EXISTS "Anyone can submit their information" ON public.client_submissions;
DROP POLICY IF EXISTS "Authenticated users can view all submissions" ON public.client_submissions;

-- Add user_id column to client_submissions to track who submitted
ALTER TABLE public.client_submissions 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- New policy: Authenticated users can insert their own submissions
CREATE POLICY "Users can submit their own information"
ON public.client_submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- New policy: Only admins can view all submissions
CREATE POLICY "Admins can view all submissions"
ON public.client_submissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- New policy: Users can view their own submissions
CREATE POLICY "Users can view own submissions"
ON public.client_submissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);