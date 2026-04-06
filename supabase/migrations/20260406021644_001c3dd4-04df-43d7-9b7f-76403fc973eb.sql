
CREATE TABLE public.cancellation_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cancellation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can create cancellation requests"
ON public.cancellation_requests
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND user_belongs_to_company(auth.uid(), company_id)
  AND has_role_in_company(auth.uid(), 'owner'::app_role, company_id)
);

CREATE POLICY "Owners can view their company cancellation requests"
ON public.cancellation_requests
FOR SELECT
TO authenticated
USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admins can view all cancellation requests"
ON public.cancellation_requests
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update cancellation requests"
ON public.cancellation_requests
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

CREATE TRIGGER update_cancellation_requests_updated_at
BEFORE UPDATE ON public.cancellation_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
