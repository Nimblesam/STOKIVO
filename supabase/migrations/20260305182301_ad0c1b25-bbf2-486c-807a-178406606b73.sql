
-- Drop old admin tables (order matters for FK dependencies)
DROP TABLE IF EXISTS public.admin_audit_logs CASCADE;
DROP TABLE IF EXISTS public.admin_users CASCADE;
DROP FUNCTION IF EXISTS public.make_admin_by_email CASCADE;

-- Recreate admin_users with security fields
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  role admin_role NOT NULL DEFAULT 'support_admin',
  status text NOT NULL DEFAULT 'invited',
  full_name text,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Admin invites
CREATE TABLE public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role admin_role NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Recreate admin_audit_logs
CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.admin_users(id),
  admin_email text,
  action text NOT NULL,
  entity text,
  entity_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Update is_admin to check status field
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = _user_id AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = _user_id AND status = 'active' AND role = 'super_admin'
  )
$$;

-- Admin RLS policies
CREATE POLICY "Admins can view admin_users" ON public.admin_users FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update own record" ON public.admin_users FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Super admins can manage admin_users" ON public.admin_users FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Admins can view invites" ON public.admin_invites FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Super admins can create invites" ON public.admin_invites FOR INSERT WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- Trigger
CREATE TRIGGER update_admin_users_updated_at_v3 BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
