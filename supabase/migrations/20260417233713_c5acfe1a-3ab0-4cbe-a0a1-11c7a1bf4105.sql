ALTER TABLE public.pos_settings
ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'stripe'
CHECK (payment_provider IN ('stripe','teya'));