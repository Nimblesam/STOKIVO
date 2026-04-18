-- Public bucket so WhatsApp recipients can download the invoice PDF via a link
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read so the wa.me link recipient can download the file
CREATE POLICY "Public can read invoice PDFs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'invoices');

-- Authenticated users can upload only into their own company's folder
CREATE POLICY "Company members can upload invoice PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
);

CREATE POLICY "Company members can update invoice PDFs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
);

CREATE POLICY "Company members can delete invoice PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
);