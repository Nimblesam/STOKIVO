
-- Add trial tracking columns to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_reminder_sent_7d BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_reminder_sent_3d BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_reminder_sent_1d BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_expired_email_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT;

-- Backfill trial_ends_at for existing rows (30 days after start) where missing
UPDATE public.subscriptions
SET trial_ends_at = started_at + INTERVAL '30 days'
WHERE trial_ends_at IS NULL;

-- Trigger to auto-set trial_ends_at on insert when null
CREATE OR REPLACE FUNCTION public.set_default_trial_end()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := COALESCE(NEW.started_at, now()) + INTERVAL '30 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_set_trial_end ON public.subscriptions;
CREATE TRIGGER subscriptions_set_trial_end
  BEFORE INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_trial_end();

-- Helper RPC: returns trial status for current user's company
CREATE OR REPLACE FUNCTION public.get_trial_status(_user_id UUID)
RETURNS TABLE (
  company_id UUID,
  trial_ends_at TIMESTAMPTZ,
  is_trialing BOOLEAN,
  is_expired BOOLEAN,
  has_active_subscription BOOLEAN,
  days_remaining INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id UUID;
  _sub RECORD;
BEGIN
  SELECT p.company_id INTO _company_id FROM public.profiles p WHERE p.user_id = _user_id LIMIT 1;
  IF _company_id IS NULL THEN
    RETURN;
  END IF;

  SELECT s.trial_ends_at, s.stripe_subscription_status, s.expires_at
  INTO _sub
  FROM public.subscriptions s
  WHERE s.company_id = _company_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  company_id := _company_id;
  trial_ends_at := _sub.trial_ends_at;
  has_active_subscription := COALESCE(_sub.stripe_subscription_status IN ('active','trialing'), false)
    OR (_sub.expires_at IS NOT NULL AND _sub.expires_at > now());
  is_expired := (_sub.trial_ends_at IS NOT NULL AND _sub.trial_ends_at < now()) AND NOT has_active_subscription;
  is_trialing := (_sub.trial_ends_at IS NOT NULL AND _sub.trial_ends_at >= now()) AND NOT has_active_subscription;
  days_remaining := GREATEST(0, EXTRACT(DAY FROM (_sub.trial_ends_at - now()))::INT);
  RETURN NEXT;
END;
$$;
