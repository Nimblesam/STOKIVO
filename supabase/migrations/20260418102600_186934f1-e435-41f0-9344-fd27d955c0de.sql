-- Cleanup: remove orphan auth users (and their profiles) that have no
-- active user_roles row. Keeps only the SNI FOODS owner.

DO $$
DECLARE
  uid uuid;
BEGIN
  CREATE TEMP TABLE _orphan_users AS
  SELECT p.user_id
  FROM public.profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.user_id AND ur.active = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_users a
    WHERE a.user_id = p.user_id
  );

  -- Remove their profile rows first
  DELETE FROM public.profiles
    WHERE user_id IN (SELECT user_id FROM _orphan_users);

  -- Remove their auth accounts
  FOR uid IN SELECT user_id FROM _orphan_users LOOP
    BEGIN
      DELETE FROM auth.users WHERE id = uid;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not delete auth user %: %', uid, SQLERRM;
    END;
  END LOOP;

  DROP TABLE _orphan_users;
END $$;