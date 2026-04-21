ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS enable_offline_payments BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_instructions TEXT;