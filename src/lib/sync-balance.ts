import { supabase } from "@/integrations/supabase/client";

/**
 * Recalculates a customer's outstanding_balance from their unpaid invoices
 * and updates the customers table. This keeps the denormalized field in sync.
 */
export async function syncCustomerBalance(customerId: string): Promise<number> {
  const { data: invoices } = await supabase
    .from("invoices")
    .select("total, amount_paid, status")
    .eq("customer_id", customerId)
    .neq("status", "paid");

  const debt = (invoices || []).reduce(
    (sum, inv) => sum + Math.max(0, inv.total - inv.amount_paid),
    0
  );

  await supabase
    .from("customers")
    .update({ outstanding_balance: debt })
    .eq("id", customerId);

  return debt;
}
