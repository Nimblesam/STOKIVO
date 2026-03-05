-- Allow super admins to delete feature flags
CREATE POLICY "Super admins can delete feature flags"
ON public.feature_flags
FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

-- Allow super admins to delete company feature flags
CREATE POLICY "Super admins can delete company feature flags"
ON public.company_feature_flags
FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));
