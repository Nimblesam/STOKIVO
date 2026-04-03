
-- 1. FIX CRITICAL: user_roles INSERT policy - restrict self-role-insert to onboarding only
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

CREATE POLICY "Users can insert their own initial role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND get_user_company_id(auth.uid()) IS NULL
);

-- 2. FIX: Storage policies for company-logos bucket
DROP POLICY IF EXISTS "Anyone can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Company members can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Company members can update logos" ON storage.objects;

CREATE POLICY "Company members can upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos'
  AND user_belongs_to_company(auth.uid(), get_user_company_id(auth.uid()))
);

CREATE POLICY "Company members can update logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos'
  AND user_belongs_to_company(auth.uid(), get_user_company_id(auth.uid()))
);

-- 3. FIX: Add feature flag read access for company users
CREATE POLICY "Users can view their company feature flags"
ON public.company_feature_flags
FOR SELECT
TO authenticated
USING (user_belongs_to_company(auth.uid(), company_id));

-- 4. FIX: Mutable search paths on functions
CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;
