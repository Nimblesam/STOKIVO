
-- 1. Fix user_roles INSERT - ensure user can only claim owner of a company with no existing roles
DROP POLICY IF EXISTS "Users can insert their own initial role" ON public.user_roles;

CREATE POLICY "Users can insert their own initial role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND get_user_company_id(auth.uid()) IS NULL
  AND role = 'owner'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.company_id = user_roles.company_id
  )
);

-- 2. The tables invoice_items, sale_items, payments, reminder_logs already have no DELETE policy
-- which means DELETE is denied by default with RLS enabled. The scanner is flagging
-- the absence of explicit policies, but since RLS is enabled and no DELETE policy exists,
-- deletes ARE blocked. This is the correct behavior for append-only audit tables.
-- We'll add explicit deny-all DELETE policies for clarity:

-- Note: We cannot create "deny" policies in Postgres RLS. Since RLS is enabled and there
-- is no DELETE policy, DELETE is already denied. The scanner warning is informational only.
-- No action needed for these tables.
