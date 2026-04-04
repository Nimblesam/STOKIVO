
-- ============================================
-- 1. STORES TABLE
-- ============================================
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company stores"
  ON public.stores FOR SELECT TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Owners can create stores"
  ON public.stores FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_company(auth.uid(), company_id)
    AND has_role_in_company(auth.uid(), 'owner', company_id));

CREATE POLICY "Owners can update stores"
  ON public.stores FOR UPDATE TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id)
    AND has_role_in_company(auth.uid(), 'owner', company_id));

CREATE POLICY "Owners can delete stores"
  ON public.stores FOR DELETE TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id)
    AND has_role_in_company(auth.uid(), 'owner', company_id));

CREATE POLICY "Admins can view all stores"
  ON public.stores FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE INDEX idx_stores_company_id ON public.stores(company_id);

-- ============================================
-- 2. USER_STORE_ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE public.user_store_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  can_switch_store BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, store_id)
);

ALTER TABLE public.user_store_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assignments in their company"
  ON public.user_store_assignments FOR SELECT TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Owners can manage assignments"
  ON public.user_store_assignments FOR ALL TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id)
    AND has_role_in_company(auth.uid(), 'owner', company_id))
  WITH CHECK (user_belongs_to_company(auth.uid(), company_id)
    AND has_role_in_company(auth.uid(), 'owner', company_id));

CREATE POLICY "Admins can view all assignments"
  ON public.user_store_assignments FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE INDEX idx_user_store_user ON public.user_store_assignments(user_id);
CREATE INDEX idx_user_store_store ON public.user_store_assignments(store_id);

-- ============================================
-- 3. HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION public.user_has_store_access(_user_id UUID, _store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_store_assignments
    WHERE user_id = _user_id AND store_id = _store_id
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_default_store(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT usa.store_id
  FROM public.user_store_assignments usa
  JOIN public.stores s ON s.id = usa.store_id
  WHERE usa.user_id = _user_id
  ORDER BY s.is_default DESC, usa.created_at ASC
  LIMIT 1
$$;

-- ============================================
-- 4. ADD store_id TO EXISTING TABLES
-- ============================================
ALTER TABLE public.products ADD COLUMN store_id UUID REFERENCES public.stores(id);
ALTER TABLE public.sales ADD COLUMN store_id UUID REFERENCES public.stores(id);
ALTER TABLE public.inventory_movements ADD COLUMN store_id UUID REFERENCES public.stores(id);
ALTER TABLE public.invoices ADD COLUMN store_id UUID REFERENCES public.stores(id);
ALTER TABLE public.customers ADD COLUMN store_id UUID REFERENCES public.stores(id);
ALTER TABLE public.alerts ADD COLUMN store_id UUID REFERENCES public.stores(id);
ALTER TABLE public.warehouses ADD COLUMN store_id UUID REFERENCES public.stores(id);
ALTER TABLE public.stock_transfers ADD COLUMN store_id UUID REFERENCES public.stores(id);

CREATE INDEX idx_products_store ON public.products(store_id);
CREATE INDEX idx_sales_store ON public.sales(store_id);
CREATE INDEX idx_inventory_movements_store ON public.inventory_movements(store_id);
CREATE INDEX idx_invoices_store ON public.invoices(store_id);
CREATE INDEX idx_customers_store ON public.customers(store_id);

-- ============================================
-- 5. BACKFILL: Create default stores for existing companies
-- ============================================
INSERT INTO public.stores (company_id, name, is_default)
SELECT id, name || ' - Main Store', true
FROM public.companies
WHERE NOT EXISTS (
  SELECT 1 FROM public.stores WHERE stores.company_id = companies.id
);

-- Backfill store_id on existing data
UPDATE public.products SET store_id = s.id
FROM public.stores s
WHERE s.company_id = products.company_id AND s.is_default = true AND products.store_id IS NULL;

UPDATE public.sales SET store_id = s.id
FROM public.stores s
WHERE s.company_id = sales.company_id AND s.is_default = true AND sales.store_id IS NULL;

UPDATE public.inventory_movements SET store_id = s.id
FROM public.stores s
WHERE s.company_id = inventory_movements.company_id AND s.is_default = true AND inventory_movements.store_id IS NULL;

UPDATE public.invoices SET store_id = s.id
FROM public.stores s
WHERE s.company_id = invoices.company_id AND s.is_default = true AND invoices.store_id IS NULL;

UPDATE public.customers SET store_id = s.id
FROM public.stores s
WHERE s.company_id = customers.company_id AND s.is_default = true AND customers.store_id IS NULL;

UPDATE public.alerts SET store_id = s.id
FROM public.stores s
WHERE s.company_id = alerts.company_id AND s.is_default = true AND alerts.store_id IS NULL;

UPDATE public.warehouses SET store_id = s.id
FROM public.stores s
WHERE s.company_id = warehouses.company_id AND s.is_default = true AND warehouses.store_id IS NULL;

UPDATE public.stock_transfers SET store_id = s.id
FROM public.stores s
WHERE s.company_id = stock_transfers.company_id AND s.is_default = true AND stock_transfers.store_id IS NULL;

-- ============================================
-- 6. ASSIGN EXISTING USERS TO DEFAULT STORES
-- ============================================
INSERT INTO public.user_store_assignments (user_id, store_id, company_id, can_switch_store)
SELECT ur.user_id, s.id, ur.company_id, true
FROM public.user_roles ur
JOIN public.stores s ON s.company_id = ur.company_id AND s.is_default = true
WHERE ur.active = true
ON CONFLICT (user_id, store_id) DO NOTHING;

-- ============================================
-- 7. TRIGGER: auto-update updated_at on stores
-- ============================================
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 8. REALTIME for stores (optional)
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.stores;
