
-- Grant necessary permissions to authenticated role on companies
GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;

-- Also ensure grants on user_roles and subscriptions for onboarding
GRANT SELECT, INSERT, UPDATE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;

-- Ensure grants on profiles
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
