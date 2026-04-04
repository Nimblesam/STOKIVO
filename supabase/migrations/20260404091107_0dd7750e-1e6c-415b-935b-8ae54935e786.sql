
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = _user_id LIMIT 1
$$;

-- Only admins can call this function
REVOKE EXECUTE ON FUNCTION public.get_user_email(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_user_email(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_email(uuid) FROM authenticated;
