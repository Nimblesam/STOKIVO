
-- Drop the restrictive INSERT policy on companies
DROP POLICY IF EXISTS "Users without a company can create one" ON public.companies;

-- Recreate as PERMISSIVE
CREATE POLICY "Users without a company can create one"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (get_user_company_id(auth.uid()) IS NULL);

-- Also fix the SELECT policy to be permissive
DROP POLICY IF EXISTS "Users can view their company" ON public.companies;
CREATE POLICY "Users can view their company"
ON public.companies
FOR SELECT
TO authenticated
USING (id = get_user_company_id(auth.uid()));

-- Fix the UPDATE policy to be permissive
DROP POLICY IF EXISTS "Owners can update their company" ON public.companies;
CREATE POLICY "Owners can update their company"
ON public.companies
FOR UPDATE
TO authenticated
USING (id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));

-- Fix user_roles INSERT policy to be permissive
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
CREATE POLICY "Users can insert their own role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Fix subscriptions ALL policy to be permissive
DROP POLICY IF EXISTS "Owners can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Owners can manage subscriptions"
ON public.subscriptions
FOR ALL
TO authenticated
USING (user_belongs_to_company(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (user_belongs_to_company(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role));

-- Fix subscriptions SELECT to be permissive
DROP POLICY IF EXISTS "Users can view their company subscription" ON public.subscriptions;
CREATE POLICY "Users can view their company subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (user_belongs_to_company(auth.uid(), company_id));
