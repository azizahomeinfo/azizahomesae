
-- 1. Create private schema for helper functions (not exposed by PostgREST)
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 2. Recreate has_role in private schema
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 3. Drop policies that reference public.has_role, then drop the public function
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can update intake forms" ON public.intake_forms;
DROP POLICY IF EXISTS "Admins can view all intake forms" ON public.intake_forms;
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.client_submissions;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 4. Recreate policies using private.has_role
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can view all contact messages" ON public.contact_messages
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update intake forms" ON public.intake_forms
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can view all intake forms" ON public.intake_forms
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can view all submissions" ON public.client_submissions
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- 5. Restrict ab_events SELECT to admins only (was: any authenticated user)
DROP POLICY IF EXISTS "authenticated can read ab events" ON public.ab_events;
CREATE POLICY "Admins can read ab events" ON public.ab_events
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- 6. Replace WITH CHECK (true) on ab_events insert with basic validation
DROP POLICY IF EXISTS "anyone can insert ab events" ON public.ab_events;
CREATE POLICY "anyone can insert ab events" ON public.ab_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    session_id IS NOT NULL
    AND length(session_id) BETWEEN 1 AND 128
    AND length(experiment) BETWEEN 1 AND 64
    AND length(variant) BETWEEN 1 AND 64
    AND length(event_type) BETWEEN 1 AND 64
    AND (path IS NULL OR length(path) <= 512)
    AND (language IS NULL OR length(language) <= 16)
  );

-- 7. Replace WITH CHECK (true) on intake_forms insert with basic validation + ownership
DROP POLICY IF EXISTS "Anyone can submit intake forms" ON public.intake_forms;
CREATE POLICY "Anyone can submit intake forms" ON public.intake_forms
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(name) BETWEEN 1 AND 200
    AND length(email) BETWEEN 3 AND 320
    AND length(client_type) BETWEEN 1 AND 64
    AND length(budget_range) BETWEEN 1 AND 64
    AND length(timeline) BETWEEN 1 AND 64
    AND (
      CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() = user_id
           ELSE user_id IS NULL END
    )
  );
