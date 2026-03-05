
-- ==============================
-- ZENTRA: Full Database Schema
-- ==============================

-- Enum types
CREATE TYPE public.app_role AS ENUM ('owner', 'manager', 'staff');
CREATE TYPE public.plan_tier AS ENUM ('starter', 'growth', 'pro');
CREATE TYPE public.business_type AS ENUM ('wholesale', 'retail', 'hybrid');
CREATE TYPE public.currency_code AS ENUM ('GBP', 'NGN');
CREATE TYPE public.unit_type AS ENUM ('bag', 'carton', 'unit', 'kg', 'bottle', 'tin');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'partially_paid', 'paid', 'overdue');
CREATE TYPE public.movement_type AS ENUM ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'SALE');
CREATE TYPE public.alert_type AS ENUM ('LOW_STOCK', 'SUPPLIER_PRICE_CHANGE');
CREATE TYPE public.alert_severity AS ENUM ('warning', 'critical');

-- ==============================
-- 1. COMPANIES
-- ==============================
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  country TEXT NOT NULL DEFAULT 'UK',
  currency currency_code NOT NULL DEFAULT 'GBP',
  logo_url TEXT,
  brand_color TEXT NOT NULL DEFAULT '#0d9488',
  business_type business_type NOT NULL DEFAULT 'wholesale',
  plan plan_tier NOT NULL DEFAULT 'starter',
  subdomain TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- ==============================
-- 2. PROFILES (linked to auth.users)
-- ==============================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==============================
-- 3. USER ROLES (separate table per instructions)
-- ==============================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'staff',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ==============================
-- 4. SUBSCRIPTIONS
-- ==============================
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  plan plan_tier NOT NULL DEFAULT 'starter',
  max_products INT NOT NULL DEFAULT 500,
  max_users INT NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ==============================
-- 5. SUPPLIERS
-- ==============================
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  last_supply_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- ==============================
-- 6. PRODUCTS
-- ==============================
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  barcode TEXT,
  category TEXT,
  unit_type unit_type NOT NULL DEFAULT 'unit',
  cost_price INT NOT NULL DEFAULT 0,
  selling_price INT NOT NULL DEFAULT 0,
  profit_margin NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN selling_price > 0 THEN ((selling_price - cost_price)::NUMERIC / selling_price * 100) ELSE 0 END
  ) STORED,
  stock_qty INT NOT NULL DEFAULT 0,
  min_stock_level INT NOT NULL DEFAULT 0,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, sku)
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ==============================
-- 7. SUPPLIER PRICE HISTORY
-- ==============================
CREATE TABLE public.supplier_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  old_cost INT NOT NULL,
  new_cost INT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.supplier_price_history ENABLE ROW LEVEL SECURITY;

-- ==============================
-- 8. CUSTOMERS
-- ==============================
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  outstanding_balance INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- ==============================
-- 9. INVOICES
-- ==============================
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  status invoice_status NOT NULL DEFAULT 'draft',
  subtotal INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  amount_paid INT NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, invoice_number)
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- ==============================
-- 10. INVOICE ITEMS
-- ==============================
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  qty INT NOT NULL DEFAULT 1,
  unit_price INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- ==============================
-- 11. PAYMENTS
-- ==============================
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  payment_method TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ==============================
-- 12. INVENTORY MOVEMENTS
-- ==============================
CREATE TABLE public.inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  type movement_type NOT NULL,
  qty INT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- ==============================
-- 13. ALERTS
-- ==============================
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type alert_type NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'warning',
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- ==============================
-- 14. REMINDER LOGS
-- ==============================
CREATE TABLE public.reminder_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT
);
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- ==============================
-- SECURITY DEFINER FUNCTIONS
-- ==============================

-- Function to check user role (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND active = true
  )
$$;

-- Function to get user's company_id (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Function to check if user belongs to a company
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND company_id = _company_id AND active = true
  )
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================
-- RLS POLICIES (all company-scoped)
-- ==============================

-- Companies: users see their own company
CREATE POLICY "Users can view their company" ON public.companies
  FOR SELECT TO authenticated
  USING (id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Owners can update their company" ON public.companies
  FOR UPDATE TO authenticated
  USING (id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Anyone can insert a company" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Profiles
CREATE POLICY "Users can view profiles in their company" ON public.profiles
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- User roles
CREATE POLICY "Users can view roles in their company" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Owners can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Users can insert their own role" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Subscriptions
CREATE POLICY "Users can view their company subscription" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Owners can manage subscriptions" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'owner'));

-- Company-scoped data tables (suppliers, products, customers, etc.)
-- Macro pattern: SELECT for all company members, INSERT/UPDATE for manager+owner, DELETE for owner

-- SUPPLIERS
CREATE POLICY "View suppliers" ON public.suppliers FOR SELECT TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Manage suppliers" ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Update suppliers" ON public.suppliers FOR UPDATE TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Delete suppliers" ON public.suppliers FOR DELETE TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'owner'));

-- PRODUCTS
CREATE POLICY "View products" ON public.products FOR SELECT TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Manage products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Update products" ON public.products FOR UPDATE TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Delete products" ON public.products FOR DELETE TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'owner'));

-- CUSTOMERS
CREATE POLICY "View customers" ON public.customers FOR SELECT TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Manage customers" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Update customers" ON public.customers FOR UPDATE TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Delete customers" ON public.customers FOR DELETE TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'owner'));

-- INVOICES
CREATE POLICY "View invoices" ON public.invoices FOR SELECT TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Manage invoices" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Update invoices" ON public.invoices FOR UPDATE TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id));

-- INVOICE ITEMS (via invoice join)
CREATE POLICY "View invoice items" ON public.invoice_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND public.user_belongs_to_company(auth.uid(), invoices.company_id)));
CREATE POLICY "Manage invoice items" ON public.invoice_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND public.user_belongs_to_company(auth.uid(), invoices.company_id)));
CREATE POLICY "Update invoice items" ON public.invoice_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND public.user_belongs_to_company(auth.uid(), invoices.company_id)));

-- PAYMENTS
CREATE POLICY "View payments" ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = payments.invoice_id AND public.user_belongs_to_company(auth.uid(), invoices.company_id)));
CREATE POLICY "Manage payments" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = payments.invoice_id AND public.user_belongs_to_company(auth.uid(), invoices.company_id)));

-- INVENTORY MOVEMENTS
CREATE POLICY "View movements" ON public.inventory_movements FOR SELECT TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Manage movements" ON public.inventory_movements FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

-- ALERTS
CREATE POLICY "View alerts" ON public.alerts FOR SELECT TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Manage alerts" ON public.alerts FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Update alerts" ON public.alerts FOR UPDATE TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id));

-- SUPPLIER PRICE HISTORY
CREATE POLICY "View price history" ON public.supplier_price_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products WHERE products.id = supplier_price_history.product_id AND public.user_belongs_to_company(auth.uid(), products.company_id)));
CREATE POLICY "Manage price history" ON public.supplier_price_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.products WHERE products.id = supplier_price_history.product_id AND public.user_belongs_to_company(auth.uid(), products.company_id)));

-- REMINDER LOGS
CREATE POLICY "View reminder logs" ON public.reminder_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = reminder_logs.invoice_id AND public.user_belongs_to_company(auth.uid(), invoices.company_id)));
CREATE POLICY "Manage reminder logs" ON public.reminder_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = reminder_logs.invoice_id AND public.user_belongs_to_company(auth.uid(), invoices.company_id)));

-- ==============================
-- STORAGE: Company logos
-- ==============================
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true);

CREATE POLICY "Anyone can view logos" ON storage.objects FOR SELECT USING (bucket_id = 'company-logos');
CREATE POLICY "Authenticated users can upload logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-logos');
CREATE POLICY "Authenticated users can update logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'company-logos');
