CREATE OR REPLACE FUNCTION public.on_product_cost_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.selling_price > 0 THEN
    NEW.profit_margin := ROUND(((NEW.selling_price - NEW.cost_price)::numeric / NEW.selling_price::numeric) * 100, 2);
  END IF;

  IF OLD.cost_price IS DISTINCT FROM NEW.cost_price AND OLD.cost_price > 0 THEN
    INSERT INTO public.supplier_price_history (product_id, supplier_id, old_cost, new_cost, changed_by)
    VALUES (
      NEW.id,
      COALESCE(NEW.supplier_id, OLD.supplier_id),
      OLD.cost_price,
      NEW.cost_price,
      auth.uid()
    );

    INSERT INTO public.alerts (company_id, type, severity, product_id, product_name, message, meta)
    VALUES (
      NEW.company_id,
      'SUPPLIER_PRICE_CHANGE',
      (CASE WHEN NEW.profit_margin IS NOT NULL AND NEW.profit_margin < 10 THEN 'critical' ELSE 'warning' END)::alert_severity,
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
$function$;