
-- Add currency to stores table for per-store currency
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'GBP';

-- Create ledger entry type enum
CREATE TYPE public.ledger_entry_type AS ENUM ('CHARGE', 'PAYMENT');

-- Create customer_ledger table
CREATE TABLE public.customer_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id),
  type public.ledger_entry_type NOT NULL,
  amount integer NOT NULL,
  description text NOT NULL DEFAULT '',
  reference_id text,
  due_date date,
  last_reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_customer_ledger_customer ON public.customer_ledger(customer_id);
CREATE INDEX idx_customer_ledger_company ON public.customer_ledger(company_id);
CREATE INDEX idx_customer_ledger_type ON public.customer_ledger(type);
CREATE INDEX idx_customer_ledger_due_date ON public.customer_ledger(due_date) WHERE type = 'CHARGE';

-- Enable RLS
ALTER TABLE public.customer_ledger ENABLE ROW LEVEL SECURITY;

-- RLS policies (append-only)
CREATE POLICY "View ledger entries" ON public.customer_ledger
  FOR SELECT TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Create ledger entries" ON public.customer_ledger
  FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admins can view all ledger entries" ON public.customer_ledger
  FOR SELECT TO public
  USING (is_admin(auth.uid()));

-- No UPDATE or DELETE policies - ledger is append-only

-- Enable realtime for ledger
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_ledger;
