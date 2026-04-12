
-- Tax rates per country
CREATE TABLE public.tax_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country text NOT NULL,
  tax_type text NOT NULL CHECK (tax_type IN ('sales', 'income')),
  rate numeric NOT NULL DEFAULT 0,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country, tax_type)
);
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tax rates" ON public.tax_rates FOR SELECT USING (true);
CREATE POLICY "Service role manages tax rates" ON public.tax_rates FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Seed default tax rates
INSERT INTO public.tax_rates (country, tax_type, rate, name) VALUES
  ('UK', 'sales', 0.20, 'VAT'),
  ('UK', 'income', 0.20, 'Income Tax'),
  ('US', 'sales', 0.07, 'Sales Tax'),
  ('US', 'income', 0.22, 'Federal Income Tax'),
  ('NG', 'sales', 0.075, 'VAT'),
  ('NG', 'income', 0.07, 'CIT'),
  ('GH', 'sales', 0.15, 'VAT'),
  ('GH', 'income', 0.25, 'Income Tax'),
  ('KE', 'sales', 0.16, 'VAT'),
  ('KE', 'income', 0.30, 'Income Tax'),
  ('ZA', 'sales', 0.15, 'VAT'),
  ('ZA', 'income', 0.27, 'Income Tax'),
  ('IN', 'sales', 0.18, 'GST'),
  ('IN', 'income', 0.30, 'Income Tax'),
  ('AE', 'sales', 0.05, 'VAT'),
  ('AE', 'income', 0.00, 'Corporate Tax'),
  ('AU', 'sales', 0.10, 'GST'),
  ('AU', 'income', 0.25, 'Income Tax'),
  ('CA', 'sales', 0.05, 'GST'),
  ('CA', 'income', 0.15, 'Federal Tax');

-- Expenses
CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id),
  amount integer NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'general',
  description text,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View expenses" ON public.expenses FOR SELECT TO authenticated USING (user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Create expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Update expenses" ON public.expenses FOR UPDATE TO authenticated USING (user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Delete expenses" ON public.expenses FOR DELETE TO authenticated USING (user_belongs_to_company(auth.uid(), company_id) AND has_role_in_company(auth.uid(), 'owner'::app_role, company_id));
CREATE INDEX idx_expenses_company_date ON public.expenses (company_id, expense_date);

-- Staff
CREATE TABLE public.staff (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id),
  name text NOT NULL,
  pay_type text NOT NULL DEFAULT 'fixed' CHECK (pay_type IN ('hourly', 'fixed')),
  hourly_rate integer DEFAULT 0,
  fixed_salary integer DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View staff" ON public.staff FOR SELECT TO authenticated USING (user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Create staff" ON public.staff FOR INSERT TO authenticated WITH CHECK (user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Update staff" ON public.staff FOR UPDATE TO authenticated USING (user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Delete staff" ON public.staff FOR DELETE TO authenticated USING (user_belongs_to_company(auth.uid(), company_id) AND has_role_in_company(auth.uid(), 'owner'::app_role, company_id));

-- Work logs
CREATE TABLE public.work_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  hours_worked numeric NOT NULL DEFAULT 0,
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View work logs" ON public.work_logs FOR SELECT TO authenticated USING (user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Create work logs" ON public.work_logs FOR INSERT TO authenticated WITH CHECK (user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Update work logs" ON public.work_logs FOR UPDATE TO authenticated USING (user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Delete work logs" ON public.work_logs FOR DELETE TO authenticated USING (user_belongs_to_company(auth.uid(), company_id));

-- Payroll runs
CREATE TABLE public.payroll_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  base_pay integer NOT NULL DEFAULT 0,
  estimated_tax integer NOT NULL DEFAULT 0,
  net_pay integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'paid')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View payroll" ON public.payroll_runs FOR SELECT TO authenticated USING (user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Create payroll" ON public.payroll_runs FOR INSERT TO authenticated WITH CHECK (user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Update payroll" ON public.payroll_runs FOR UPDATE TO authenticated USING (user_belongs_to_company(auth.uid(), company_id));

-- Triggers for updated_at
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tax_rates_updated_at BEFORE UPDATE ON public.tax_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
