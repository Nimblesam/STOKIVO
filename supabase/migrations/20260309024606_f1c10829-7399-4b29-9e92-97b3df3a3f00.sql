
-- Attach missing triggers (excluding auth.users which already has one)

-- Stock change trigger
CREATE TRIGGER trg_on_stock_change
  BEFORE UPDATE OF stock_qty, min_stock_level ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.on_stock_change();

-- Cost price change trigger
CREATE TRIGGER trg_on_product_cost_change
  BEFORE UPDATE OF cost_price, selling_price ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.on_product_cost_change();

-- Auto-update updated_at
CREATE TRIGGER trg_updated_at_companies
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at_products
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at_customers
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at_suppliers
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at_admin_users
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
