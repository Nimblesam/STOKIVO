
-- Trigger: auto-recalculate profit_margin and log price changes when cost_price changes
CREATE OR REPLACE FUNCTION public.on_product_cost_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Recalculate profit margin
  IF NEW.selling_price > 0 THEN
    NEW.profit_margin := ROUND(((NEW.selling_price - NEW.cost_price)::numeric / NEW.selling_price::numeric) * 100, 2);
  END IF;

  -- If cost_price changed, log to supplier_price_history and create alert
  IF OLD.cost_price IS DISTINCT FROM NEW.cost_price AND OLD.cost_price > 0 THEN
    -- Insert price history
    INSERT INTO public.supplier_price_history (product_id, supplier_id, old_cost, new_cost, changed_by)
    VALUES (
      NEW.id,
      COALESCE(NEW.supplier_id, OLD.supplier_id),
      OLD.cost_price,
      NEW.cost_price,
      auth.uid()
    );

    -- Create alert
    INSERT INTO public.alerts (company_id, type, severity, product_id, product_name, message, meta)
    VALUES (
      NEW.company_id,
      'SUPPLIER_PRICE_CHANGE',
      CASE WHEN NEW.profit_margin IS NOT NULL AND NEW.profit_margin < 10 THEN 'critical' ELSE 'warning' END,
      NEW.id,
      NEW.name,
      CASE
        WHEN NEW.cost_price > OLD.cost_price THEN
          'Cost increased from £' || ROUND(OLD.cost_price / 100.0, 2) || ' to £' || ROUND(NEW.cost_price / 100.0, 2) ||
          ' (+' || ROUND(((NEW.cost_price - OLD.cost_price)::numeric / OLD.cost_price::numeric) * 100, 1) || '%)'
        ELSE
          'Cost decreased from £' || ROUND(OLD.cost_price / 100.0, 2) || ' to £' || ROUND(NEW.cost_price / 100.0, 2) ||
          ' (' || ROUND(((NEW.cost_price - OLD.cost_price)::numeric / OLD.cost_price::numeric) * 100, 1) || '%)'
      END ||
      CASE WHEN NEW.profit_margin IS NOT NULL AND NEW.profit_margin < 10 THEN ' – Margin at risk!' ELSE '' END,
      jsonb_build_object('oldCost', OLD.cost_price, 'newCost', NEW.cost_price, 'supplierId', COALESCE(NEW.supplier_id, OLD.supplier_id), 'newMargin', NEW.profit_margin)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_product_cost_change
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.on_product_cost_change();

-- Trigger: auto-generate low stock alerts when stock changes
CREATE OR REPLACE FUNCTION public.on_stock_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If stock dropped to or below min level
  IF NEW.stock_qty <= NEW.min_stock_level AND (OLD.stock_qty > OLD.min_stock_level OR OLD.stock_qty IS DISTINCT FROM NEW.stock_qty) THEN
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

CREATE TRIGGER trg_stock_change
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.on_stock_change();
