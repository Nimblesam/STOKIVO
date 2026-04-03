-- Add admin SELECT policy for inventory_movements
CREATE POLICY "Admins can view all inventory_movements"
ON public.inventory_movements
FOR SELECT
USING (is_admin(auth.uid()));

-- Add admin SELECT policy for reminder_logs
CREATE POLICY "Admins can view all reminder_logs"
ON public.reminder_logs
FOR SELECT
USING (is_admin(auth.uid()));

-- Add super admin DELETE policy for admin_invites
CREATE POLICY "Super admins can delete invites"
ON public.admin_invites
FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

-- Add super admin UPDATE policy for admin_invites
CREATE POLICY "Super admins can update invites"
ON public.admin_invites
FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));