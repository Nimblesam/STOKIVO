CREATE OR REPLACE FUNCTION public.on_stock_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.min_stock_level IS NULL OR NEW.min_stock_level <= 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.stock_qty <= NEW.min_stock_level
     AND (
       COALESCE(OLD.stock_qty, 0) > COALESCE(OLD.min_stock_level, 0)
       OR OLD.stock_qty IS DISTINCT FROM NEW.stock_qty
       OR OLD.min_stock_level IS DISTINCT FROM NEW.min_stock_level
     )
  THEN
    DELETE FROM public.alerts
    WHERE product_id = NEW.id AND type = 'LOW_STOCK' AND read = false;

    INSERT INTO public.alerts (company_id, type, severity, product_id, product_name, message)
    VALUES (
      NEW.company_id,
      'LOW_STOCK',
      (CASE WHEN NEW.stock_qty <= NEW.min_stock_level * 0.5 THEN 'critical' ELSE 'warning' END)::alert_severity,
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
$function$;