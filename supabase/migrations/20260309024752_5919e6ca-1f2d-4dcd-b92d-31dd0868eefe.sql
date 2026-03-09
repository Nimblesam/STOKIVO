
-- Remove duplicate triggers on products (keep the new ones)
DROP TRIGGER IF EXISTS trg_stock_change ON public.products;
DROP TRIGGER IF EXISTS trg_product_cost_change ON public.products;

-- Remove duplicate updated_at triggers (keep the new trg_updated_at_* ones)
DROP TRIGGER IF EXISTS update_admin_users_updated_at_v3 ON public.admin_users;
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON public.feature_flags;
DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
