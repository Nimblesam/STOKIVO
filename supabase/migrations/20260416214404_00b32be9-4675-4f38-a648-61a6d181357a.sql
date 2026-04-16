-- Enable realtime for the companies table so merchants get live updates when admins approve
ALTER TABLE public.companies REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'companies'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.companies;
  END IF;
END $$;