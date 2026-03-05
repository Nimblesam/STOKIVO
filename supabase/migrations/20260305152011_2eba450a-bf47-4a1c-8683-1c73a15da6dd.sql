
-- Sales / POS transactions table
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  cashier_id uuid NOT NULL,
  cashier_name text NOT NULL,
  subtotal integer NOT NULL DEFAULT 0,
  discount integer NOT NULL DEFAULT 0,
  tax integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  change_given integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View sales" ON public.sales FOR SELECT TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Create sales" ON public.sales FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

-- Sale line items
CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  qty integer NOT NULL DEFAULT 1,
  unit_price integer NOT NULL DEFAULT 0,
  line_total integer NOT NULL DEFAULT 0
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View sale items" ON public.sale_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND user_belongs_to_company(auth.uid(), sales.company_id)));

CREATE POLICY "Create sale items" ON public.sale_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND user_belongs_to_company(auth.uid(), sales.company_id)));

-- Sale payments (supports split cash+card)
CREATE TABLE public.sale_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  method text NOT NULL, -- 'cash' or 'card'
  amount integer NOT NULL DEFAULT 0,
  provider text, -- 'stripe_terminal', 'sumup', 'mock'
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View sale payments" ON public.sale_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_payments.sale_id AND user_belongs_to_company(auth.uid(), sales.company_id)));

CREATE POLICY "Create sale payments" ON public.sale_payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_payments.sale_id AND user_belongs_to_company(auth.uid(), sales.company_id)));
