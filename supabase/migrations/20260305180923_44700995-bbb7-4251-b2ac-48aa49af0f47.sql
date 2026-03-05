
-- Admin roles enum
CREATE TYPE public.admin_role AS ENUM ('super_admin', 'support_admin');

-- Admin users table
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  role admin_role NOT NULL DEFAULT 'support_admin',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Admin audit logs
CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES public.admin_users(id),
  admin_email text,
  action_type text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Feature flags
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  enabled_global boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Company feature flag overrides
CREATE TABLE public.company_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  flag_id uuid REFERENCES public.feature_flags(id) ON DELETE CASCADE NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, flag_id)
);

-- Webhook events
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_type text NOT NULL,
  payload jsonb,
  status text NOT NULL DEFAULT 'received',
  error_message text,
  retries integer NOT NULL DEFAULT 0,
  company_id uuid REFERENCES public.companies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- System jobs log
CREATE TABLE public.system_jobs_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'failed',
  error_message text,
  metadata jsonb,
  resolved boolean NOT NULL DEFAULT false,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- Add status column to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Enable RLS on all admin tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_jobs_log ENABLE ROW LEVEL SECURITY;

-- Admin check functions
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = _user_id AND active = true
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
    WHERE user_id = _user_id AND active = true AND role = 'super_admin'
  )
$$;

-- RLS policies for admin tables
CREATE POLICY "Admins can view admin_users" ON public.admin_users FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Super admins can manage admin_users" ON public.admin_users FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can view feature flags" ON public.feature_flags FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Super admins can manage feature flags" ON public.feature_flags FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Admins can view company feature flags" ON public.company_feature_flags FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Super admins can manage company feature flags" ON public.company_feature_flags FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Admins can view webhook events" ON public.webhook_events FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update webhook events" ON public.webhook_events FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view system jobs" ON public.system_jobs_log FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage system jobs" ON public.system_jobs_log FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert system jobs" ON public.system_jobs_log FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- Admin access to existing tables (read across all companies)
CREATE POLICY "Admins can view all companies" ON public.companies FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Super admins can update all companies" ON public.companies FOR UPDATE USING (is_super_admin(auth.uid()));
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can view all user_roles" ON public.user_roles FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Super admins can manage all user_roles" ON public.user_roles FOR UPDATE USING (is_super_admin(auth.uid()));
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Super admins can manage all subscriptions" ON public.subscriptions FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Admins can view all invoices" ON public.invoices FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can view all sales" ON public.sales FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can view all sale_items" ON public.sale_items FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can view all sale_payments" ON public.sale_payments FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can view all products" ON public.products FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can view all customers" ON public.customers FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can view all suppliers" ON public.suppliers FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can view all alerts" ON public.alerts FOR SELECT USING (is_admin(auth.uid()));

-- Seed default feature flags
INSERT INTO public.feature_flags (flag_key, label, description) VALUES
  ('supplier_price_intelligence', 'Supplier Price Intelligence', 'Enable supplier price tracking and alerts'),
  ('pos_cashier', 'POS Cashier', 'Enable point-of-sale cashier module'),
  ('payment_links', 'Payment Links', 'Enable payment link generation');

-- Updated_at triggers
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to bootstrap admin by email
CREATE OR REPLACE FUNCTION public.make_admin_by_email(_email text, _role admin_role DEFAULT 'super_admin')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  SELECT id INTO _user_id FROM auth.users WHERE email = _email;
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Register first.', _email;
  END IF;
  INSERT INTO public.admin_users (user_id, email, role)
  VALUES (_user_id, _email, _role)
  ON CONFLICT (user_id) DO UPDATE SET role = _role, active = true;
END;
$$;
