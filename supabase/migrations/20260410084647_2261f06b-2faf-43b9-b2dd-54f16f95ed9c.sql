-- Add restaurant to business_type enum
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'restaurant';

-- Create drawer_events table for logging
CREATE TABLE public.drawer_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  trigger_type text NOT NULL DEFAULT 'cash_payment',
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.drawer_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View drawer events" ON public.drawer_events
  FOR SELECT TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Create drawer events" ON public.drawer_events
  FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

-- Create pos_settings table
CREATE TABLE public.pos_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  auto_open_drawer boolean NOT NULL DEFAULT true,
  printer_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View POS settings" ON public.pos_settings
  FOR SELECT TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Owners can manage POS settings" ON public.pos_settings
  FOR ALL TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id) AND has_role_in_company(auth.uid(), 'owner'::app_role, company_id))
  WITH CHECK (user_belongs_to_company(auth.uid(), company_id) AND has_role_in_company(auth.uid(), 'owner'::app_role, company_id));

CREATE POLICY "Managers can update POS settings" ON public.pos_settings
  FOR UPDATE TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id) AND has_role_in_company(auth.uid(), 'manager'::app_role, company_id));

CREATE TRIGGER update_pos_settings_updated_at
  BEFORE UPDATE ON public.pos_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();