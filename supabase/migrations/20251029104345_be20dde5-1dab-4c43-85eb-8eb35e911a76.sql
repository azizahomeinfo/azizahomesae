-- Drop the existing policy that requires authentication
DROP POLICY IF EXISTS "Users can submit their own information" ON client_submissions;

-- Create new policy that allows both authenticated and guest submissions
CREATE POLICY "Anyone can submit client information"
ON client_submissions
FOR INSERT
WITH CHECK (
  CASE
    WHEN auth.uid() IS NOT NULL THEN auth.uid() = user_id
    ELSE user_id IS NULL
  END
);