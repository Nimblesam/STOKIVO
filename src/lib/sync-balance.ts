import { supabase } from "@/integrations/supabase/client";

/**
 * Recalculates a customer's outstanding_balance and updates the customers table.
 *
 * Data sources combined:
 *  1. Customer ledger entries (CHARGE / PAYMENT)
 *  2. Unpaid/partially-paid invoices that don't already have a matching
 *     CHARGE ledger entry (reference_id = invoice id).
 *
 * This guarantees every unpaid invoice AND every manual ledger charge are
 * reflected in the merchant's "Credit Owed" number — never one without the
 * other. We always persist the final value back to `customers.outstanding_balance`.
 */
export async function syncCustomerBalance(customerId: string): Promise<number> {
  // 1) Pull all ledger entries for the customer.
  const { data: entries } = await supabase
    .from("customer_ledger")
    .select("type, amount, reference_id")
    .eq("customer_id", customerId);

  let debt = 0;
  const ledgerInvoiceIds = new Set<string>();
  for (const e of entries || []) {
    if (e.type === "CHARGE") {
      debt += e.amount;
      if (e.reference_id) ledgerInvoiceIds.add(e.reference_id);
    } else {
      debt -= e.amount;
    }
  }

  // 2) Add unpaid invoice balances that are NOT already represented in the ledger
  //    (so we don't double count invoices that wrote a CHARGE row).
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, total, amount_paid, status")
    .eq("customer_id", customerId)
    .neq("status", "paid");

  for (const inv of invoices || []) {
    if (ledgerInvoiceIds.has(inv.id)) continue;
    const unpaid = Math.max(0, (inv.total || 0) - (inv.amount_paid || 0));
    debt += unpaid;
  }

  const finalDebt = Math.max(0, debt);
  await supabase
    .from("customers")
    .update({ outstanding_balance: finalDebt })
    .eq("id", customerId);

  return finalDebt;
}

/**
 * Recompute balances for every customer in a company. Useful when dashboards
 * show stale numbers or when invoices existed before the ledger was adopted.
 */
export async function syncAllCustomerBalances(companyId: string): Promise<void> {
  const { data: customers } = await supabase
    .from("customers")
    .select("id")
    .eq("company_id", companyId);
  if (!customers) return;
  await Promise.all(customers.map((c) => syncCustomerBalance(c.id)));
}
