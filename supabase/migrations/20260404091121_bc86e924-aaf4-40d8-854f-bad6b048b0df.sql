
-- Allow authenticated users to execute (the function itself will be called by admins)
GRANT EXECUTE ON FUNCTION public.get_user_email(uuid) TO authenticated;

-- Create a wrapper that checks admin status
CREATE OR REPLACE FUNCTION public.admin_get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN is_admin(auth.uid()) THEN (SELECT email FROM auth.users WHERE id = _user_id LIMIT 1)
    ELSE NULL
  END
$$;
