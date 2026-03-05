
-- Add more currencies to the enum
ALTER TYPE public.currency_code ADD VALUE IF NOT EXISTS 'USD';
ALTER TYPE public.currency_code ADD VALUE IF NOT EXISTS 'EUR';
ALTER TYPE public.currency_code ADD VALUE IF NOT EXISTS 'CAD';
ALTER TYPE public.currency_code ADD VALUE IF NOT EXISTS 'GHS';
ALTER TYPE public.currency_code ADD VALUE IF NOT EXISTS 'KES';
ALTER TYPE public.currency_code ADD VALUE IF NOT EXISTS 'ZAR';
ALTER TYPE public.currency_code ADD VALUE IF NOT EXISTS 'INR';
ALTER TYPE public.currency_code ADD VALUE IF NOT EXISTS 'AED';
ALTER TYPE public.currency_code ADD VALUE IF NOT EXISTS 'AUD';
