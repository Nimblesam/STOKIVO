-- Ensure low-stock alerts don't fire for products without a configured minimum
CREATE OR REPLACE FUNCTION public.on_stock_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.min_stock_level IS NULL OR NEW.min_stock_level <= 0 THEN
    RETURN NEW;
  END IF;

  -- If stock dropped to or below min level
  IF NEW.stock_qty <= NEW.min_stock_level
     AND (
       COALESCE(OLD.stock_qty, 0) > COALESCE(OLD.min_stock_level, 0)
       OR OLD.stock_qty IS DISTINCT FROM NEW.stock_qty
       OR OLD.min_stock_level IS DISTINCT FROM NEW.min_stock_level
     )
  THEN
    -- Delete existing unread low stock alert for this product to avoid duplicates
    DELETE FROM public.alerts
    WHERE product_id = NEW.id AND type = 'LOW_STOCK' AND read = false;

    INSERT INTO public.alerts (company_id, type, severity, product_id, product_name, message)
    VALUES (
      NEW.company_id,
      'LOW_STOCK',
      CASE WHEN NEW.stock_qty <= NEW.min_stock_level * 0.5 THEN 'critical' ELSE 'warning' END,
      NEW.id,
      NEW.name,
      CASE
        WHEN NEW.stock_qty <= NEW.min_stock_level * 0.5 THEN
          'Critical: Only ' || NEW.stock_qty || ' units left (min: ' || NEW.min_stock_level || ')'
        ELSE
          'Warning: ' || NEW.stock_qty || ' units left (min: ' || NEW.min_stock_level || ')'
      END
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach triggers so alerts + price history are generated automatically
DROP TRIGGER IF EXISTS products_on_stock_change ON public.products;
CREATE TRIGGER products_on_stock_change
BEFORE UPDATE OF stock_qty, min_stock_level ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.on_stock_change();

DROP TRIGGER IF EXISTS products_on_product_cost_change ON public.products;
CREATE TRIGGER products_on_product_cost_change
BEFORE UPDATE OF cost_price, selling_price ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.on_product_cost_change();
