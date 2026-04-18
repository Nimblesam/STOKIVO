-- Kitchen Display System (KDS) tables
CREATE TABLE public.kitchen_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','preparing','ready','served','cancelled')),
  cashier_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ
);

CREATE TABLE public.kitchen_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.kitchen_orders(id) ON DELETE CASCADE,
  product_id UUID,
  product_name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  notes TEXT
);

CREATE INDEX idx_kitchen_orders_company_status ON public.kitchen_orders(company_id, status);
CREATE INDEX idx_kitchen_orders_store ON public.kitchen_orders(store_id);
CREATE INDEX idx_kitchen_order_items_order ON public.kitchen_order_items(order_id);

ALTER TABLE public.kitchen_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View kitchen orders" ON public.kitchen_orders
  FOR SELECT TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Create kitchen orders" ON public.kitchen_orders
  FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Update kitchen orders" ON public.kitchen_orders
  FOR UPDATE TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "View kitchen order items" ON public.kitchen_order_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kitchen_orders ko WHERE ko.id = kitchen_order_items.order_id AND user_belongs_to_company(auth.uid(), ko.company_id)));

CREATE POLICY "Create kitchen order items" ON public.kitchen_order_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.kitchen_orders ko WHERE ko.id = kitchen_order_items.order_id AND user_belongs_to_company(auth.uid(), ko.company_id)));

CREATE TRIGGER update_kitchen_orders_updated_at
  BEFORE UPDATE ON public.kitchen_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.kitchen_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kitchen_order_items;
ALTER TABLE public.kitchen_orders REPLICA IDENTITY FULL;
ALTER TABLE public.kitchen_order_items REPLICA IDENTITY FULL;