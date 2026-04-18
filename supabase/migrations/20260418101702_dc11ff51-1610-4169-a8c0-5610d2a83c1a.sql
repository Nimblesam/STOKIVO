-- Production reset: keep only SNI FOODS LTD as a clean shell company.
-- Wipe all transactional/operational data across the entire database,
-- delete every other company (and their auth users), and zero-out SNI.

DO $$
DECLARE
  sni_id constant uuid := '0af7069a-4d35-4ed3-9ba5-f112783bcc6d';
  uid uuid;
BEGIN
  -- ============================================================
  -- 1) Wipe data scoped to companies (children → parents)
  -- ============================================================

  -- Children of invoices
  DELETE FROM public.payments;
  DELETE FROM public.reminder_logs;
  DELETE FROM public.invoice_items;
  DELETE FROM public.invoices;

  -- Children of sales
  DELETE FROM public.sale_items;
  DELETE FROM public.sale_payments;
  DELETE FROM public.sales;

  -- Stock & inventory
  DELETE FROM public.warehouse_stock;
  DELETE FROM public.stock_transfers;
  DELETE FROM public.inventory_movements;
  DELETE FROM public.supplier_price_history;

  -- Drawer / POS activity
  DELETE FROM public.drawer_events;

  -- Ledger & alerts
  DELETE FROM public.customer_ledger;
  DELETE FROM public.alerts;

  -- Payroll
  DELETE FROM public.payroll_runs;
  DELETE FROM public.work_logs;

  -- Operational records
  DELETE FROM public.expenses;
  DELETE FROM public.products;
  DELETE FROM public.customers;
  DELETE FROM public.suppliers;
  DELETE FROM public.staff;
  DELETE FROM public.warehouses;

  -- POS / cashier / config
  DELETE FROM public.cashier_users;
  DELETE FROM public.pos_settings;
  DELETE FROM public.company_feature_flags;

  -- Cancellation requests / webhook events
  DELETE FROM public.cancellation_requests;
  DELETE FROM public.webhook_events;

  -- ============================================================
  -- 2) Delete companies (except SNI) — store/role/profile/auth cleanup
  -- ============================================================

  -- Stores belonging to other companies
  DELETE FROM public.user_store_assignments
    WHERE company_id <> sni_id;
  DELETE FROM public.stores
    WHERE company_id <> sni_id;

  -- Subscriptions for other companies
  DELETE FROM public.subscriptions
    WHERE company_id <> sni_id;

  -- Capture user IDs that belong only to non-SNI companies
  CREATE TEMP TABLE _deletable_users AS
  SELECT DISTINCT ur.user_id
  FROM public.user_roles ur
  WHERE ur.company_id <> sni_id
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = ur.user_id
        AND ur2.company_id = sni_id
    );

  -- Remove their roles + profiles
  DELETE FROM public.user_roles
    WHERE company_id <> sni_id;

  DELETE FROM public.profiles
    WHERE user_id IN (SELECT user_id FROM _deletable_users);

  -- Delete the companies themselves
  DELETE FROM public.companies
    WHERE id <> sni_id;

  -- Delete their auth accounts
  FOR uid IN SELECT user_id FROM _deletable_users LOOP
    BEGIN
      DELETE FROM auth.users WHERE id = uid;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not delete auth user %: %', uid, SQLERRM;
    END;
  END LOOP;

  DROP TABLE _deletable_users;

  -- ============================================================
  -- 3) Reset SNI subscription to a fresh trial
  -- ============================================================
  UPDATE public.subscriptions
  SET trial_reminder_sent_7d = false,
      trial_reminder_sent_3d = false,
      trial_reminder_sent_1d = false,
      trial_expired_email_sent = false
  WHERE company_id = sni_id;

  -- ============================================================
  -- 4) Clear orphan/test rows in shared logs (best effort)
  -- ============================================================
  DELETE FROM public.email_send_log;
  DELETE FROM public.email_unsubscribe_tokens;
  DELETE FROM public.system_jobs_log;
  DELETE FROM public.suppressed_emails;
END $$;