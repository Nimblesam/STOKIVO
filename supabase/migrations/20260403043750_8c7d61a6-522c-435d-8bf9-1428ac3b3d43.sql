
-- 1. Fix user_roles INSERT - restrict to 'owner' role only during onboarding
DROP POLICY IF EXISTS "Users can insert their own initial role" ON public.user_roles;

CREATE POLICY "Users can insert their own initial role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND get_user_company_id(auth.uid()) IS NULL
  AND role = 'owner'
);

-- 2. Fix storage - remove any overly broad policies
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to company-logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to company-logos" ON storage.objects;

-- 3. Fix admin invites - restrict to super_admin only
DROP POLICY IF EXISTS "Admins can view invites" ON public.admin_invites;

CREATE POLICY "Super admins can view invites"
ON public.admin_invites
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- 4. Fix admin self-update - require actual admin status
DROP POLICY IF EXISTS "Admins can update own record" ON public.admin_users;

CREATE POLICY "Admins can update own record"
ON public.admin_users
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND is_admin(auth.uid()));

-- 5. Create company-scoped has_role function
CREATE OR REPLACE FUNCTION public.has_role_in_company(_user_id uuid, _role app_role, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND company_id = _company_id AND active = true
  )
$$;

-- 6. Update policies that use has_role to scope by company

-- companies: Owners can update their company
DROP POLICY IF EXISTS "Owners can update their company" ON public.companies;
CREATE POLICY "Owners can update their company"
ON public.companies
FOR UPDATE
TO authenticated
USING (id = get_user_company_id(auth.uid()) AND has_role_in_company(auth.uid(), 'owner', id));

-- user_roles: Owners can manage roles (scoped)
DROP POLICY IF EXISTS "Owners can manage roles" ON public.user_roles;
CREATE POLICY "Owners can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (user_belongs_to_company(auth.uid(), company_id) AND has_role_in_company(auth.uid(), 'owner', company_id))
WITH CHECK (user_belongs_to_company(auth.uid(), company_id) AND has_role_in_company(auth.uid(), 'owner', company_id));

-- suppliers: Delete suppliers (owner scoped)
DROP POLICY IF EXISTS "Delete suppliers" ON public.suppliers;
CREATE POLICY "Delete suppliers"
ON public.suppliers
FOR DELETE
TO authenticated
USING (user_belongs_to_company(auth.uid(), company_id) AND has_role_in_company(auth.uid(), 'owner', company_id));

-- customers: Delete customers (owner scoped)
DROP POLICY IF EXISTS "Delete customers" ON public.customers;
CREATE POLICY "Delete customers"
ON public.customers
FOR DELETE
TO authenticated
USING (user_belongs_to_company(auth.uid(), company_id) AND has_role_in_company(auth.uid(), 'owner', company_id));

-- products: Delete products (owner scoped)
DROP POLICY IF EXISTS "Delete products" ON public.products;
CREATE POLICY "Delete products"
ON public.products
FOR DELETE
TO authenticated
USING (user_belongs_to_company(auth.uid(), company_id) AND has_role_in_company(auth.uid(), 'owner', company_id));

-- warehouses: Delete warehouses (owner scoped)
DROP POLICY IF EXISTS "Delete warehouses" ON public.warehouses;
CREATE POLICY "Delete warehouses"
ON public.warehouses
FOR DELETE
TO authenticated
USING (user_belongs_to_company(auth.uid(), company_id) AND has_role_in_company(auth.uid(), 'owner', company_id));

-- subscriptions: Owners can manage subscriptions (scoped)
DROP POLICY IF EXISTS "Owners can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Owners can manage subscriptions"
ON public.subscriptions
FOR ALL
TO authenticated
USING (user_belongs_to_company(auth.uid(), company_id) AND has_role_in_company(auth.uid(), 'owner', company_id))
WITH CHECK (user_belongs_to_company(auth.uid(), company_id) AND has_role_in_company(auth.uid(), 'owner', company_id));
