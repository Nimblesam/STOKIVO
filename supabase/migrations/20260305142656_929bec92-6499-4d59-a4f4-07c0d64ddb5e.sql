
-- Fix: restrict company creation to users who don't already have a company
DROP POLICY "Anyone can insert a company" ON public.companies;
CREATE POLICY "Users without a company can create one" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_company_id(auth.uid()) IS NULL);
