import { supabase } from "@/integrations/supabase/client";

/**
 * Recalculates a customer's outstanding_balance from their ledger entries
 * and updates the customers table. Ledger is the single source of truth.
 */
export async function syncCustomerBalance(customerId: string): Promise<number> {
  // Primary: calculate from ledger
  const { data: entries } = await supabase
    .from("customer_ledger")
    .select("type, amount")
    .eq("customer_id", customerId);

  let debt = 0;
  if (entries && entries.length > 0) {
    for (const e of entries) {
      if (e.type === "CHARGE") debt += e.amount;
      else debt -= e.amount;
    }
  } else {
    // Fallback: calculate from invoices (for legacy data)
    const { data: invoices } = await supabase
      .from("invoices")
      .select("total, amount_paid, status")
      .eq("customer_id", customerId)
      .neq("status", "paid");

    debt = (invoices || []).reduce(
      (sum, inv) => sum + Math.max(0, inv.total - inv.amount_paid),
      0
    );
  }

  const finalDebt = Math.max(0, debt);
  await supabase
    .from("customers")
    .update({ outstanding_balance: finalDebt })
    .eq("id", customerId);

  return finalDebt;
}
