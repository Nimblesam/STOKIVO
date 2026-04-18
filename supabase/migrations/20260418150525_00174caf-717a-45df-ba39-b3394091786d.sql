-- Allow owners to delete invoices in their company
CREATE POLICY "Owners can delete invoices"
ON public.invoices
FOR DELETE
TO authenticated
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND has_role_in_company(auth.uid(), 'owner'::app_role, company_id)
);

-- Allow deletion of related child rows (so cascade can succeed via FK or via explicit deletes)
CREATE POLICY "Delete invoice items"
ON public.invoice_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_items.invoice_id
      AND user_belongs_to_company(auth.uid(), i.company_id)
      AND has_role_in_company(auth.uid(), 'owner'::app_role, i.company_id)
  )
);

CREATE POLICY "Delete payments"
ON public.payments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = payments.invoice_id
      AND user_belongs_to_company(auth.uid(), i.company_id)
      AND has_role_in_company(auth.uid(), 'owner'::app_role, i.company_id)
  )
);

CREATE POLICY "Delete reminder logs"
ON public.reminder_logs
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = reminder_logs.invoice_id
      AND user_belongs_to_company(auth.uid(), i.company_id)
      AND has_role_in_company(auth.uid(), 'owner'::app_role, i.company_id)
  )
);