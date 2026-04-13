-- Create cashier_users table for POS PIN-based access
CREATE TABLE public.cashier_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  name text NOT NULL,
  pin text NOT NULL,
  role text NOT NULL DEFAULT 'staff',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cashier_users ENABLE ROW LEVEL SECURITY;

-- Owners can fully manage cashier users
CREATE POLICY "Owners can manage cashier users"
ON public.cashier_users FOR ALL
TO authenticated
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND has_role_in_company(auth.uid(), 'owner', company_id)
)
WITH CHECK (
  user_belongs_to_company(auth.uid(), company_id)
  AND has_role_in_company(auth.uid(), 'owner', company_id)
);

-- All company members can view cashier users (for PIN entry screen)
CREATE POLICY "Company members can view cashier users"
ON public.cashier_users FOR SELECT
TO authenticated
USING (user_belongs_to_company(auth.uid(), company_id));

-- Secure PIN verification function (does not expose PIN)
CREATE OR REPLACE FUNCTION public.verify_cashier_pin(_company_id uuid, _cashier_id uuid, _pin text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cashier_users
    WHERE id = _cashier_id
      AND company_id = _company_id
      AND pin = _pin
      AND active = true
  )
$$;

-- Auto-update updated_at
CREATE TRIGGER update_cashier_users_updated_at
BEFORE UPDATE ON public.cashier_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();