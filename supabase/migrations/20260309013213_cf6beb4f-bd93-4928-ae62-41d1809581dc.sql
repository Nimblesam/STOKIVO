-- Remove duplicate triggers introduced by a previous migration; keep existing trg_* triggers
DROP TRIGGER IF EXISTS products_on_stock_change ON public.products;
DROP TRIGGER IF EXISTS products_on_product_cost_change ON public.products;
