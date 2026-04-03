
-- Warehouses table
CREATE TABLE public.warehouses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View warehouses" ON public.warehouses FOR SELECT TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Admins can view all warehouses" ON public.warehouses FOR SELECT
  USING (is_admin(auth.uid()));
CREATE POLICY "Create warehouses" ON public.warehouses FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Update warehouses" ON public.warehouses FOR UPDATE TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Delete warehouses" ON public.warehouses FOR DELETE TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role));

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Warehouse stock table
CREATE TABLE public.warehouse_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(warehouse_id, product_id)
);

ALTER TABLE public.warehouse_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View warehouse stock" ON public.warehouse_stock FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = warehouse_stock.warehouse_id AND user_belongs_to_company(auth.uid(), w.company_id)));
CREATE POLICY "Admins can view all warehouse stock" ON public.warehouse_stock FOR SELECT
  USING (is_admin(auth.uid()));
CREATE POLICY "Manage warehouse stock" ON public.warehouse_stock FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = warehouse_stock.warehouse_id AND user_belongs_to_company(auth.uid(), w.company_id)));
CREATE POLICY "Update warehouse stock" ON public.warehouse_stock FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = warehouse_stock.warehouse_id AND user_belongs_to_company(auth.uid(), w.company_id)));

CREATE TRIGGER update_warehouse_stock_updated_at BEFORE UPDATE ON public.warehouse_stock
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stock transfers table
CREATE TABLE public.stock_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  from_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  to_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  qty INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View transfers" ON public.stock_transfers FOR SELECT TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Admins can view all transfers" ON public.stock_transfers FOR SELECT
  USING (is_admin(auth.uid()));
CREATE POLICY "Create transfers" ON public.stock_transfers FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Update transfers" ON public.stock_transfers FOR UPDATE TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));
