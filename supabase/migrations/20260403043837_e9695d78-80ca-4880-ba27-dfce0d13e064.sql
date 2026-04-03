
-- Drop existing policies
DROP POLICY IF EXISTS "Company members can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Company members can update logos" ON storage.objects;

-- Recreate with path-based ownership
CREATE POLICY "Company members can upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
);

CREATE POLICY "Company members can update logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
);

CREATE POLICY "Company members can delete logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = get_user_company_id(auth.uid())::text
);
