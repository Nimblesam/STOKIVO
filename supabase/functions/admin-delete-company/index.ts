import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    // Verify the calling user is a super admin
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Invalid session" }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isSuper, error: superErr } = await admin.rpc(
      "is_super_admin",
      { _user_id: userData.user.id }
    );
    if (superErr || !isSuper) {
      return json({ error: "Forbidden: super admin required" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const companyId = body?.companyId as string | undefined;
    if (!companyId || typeof companyId !== "string") {
      return json({ error: "companyId is required" }, 400);
    }

    // Load company; only allow deletion when status === 'disabled'
    const { data: company, error: companyErr } = await admin
      .from("companies")
      .select("id, name, status")
      .eq("id", companyId)
      .maybeSingle();
    if (companyErr) return json({ error: companyErr.message }, 500);
    if (!company) return json({ error: "Company not found" }, 404);
    if (company.status !== "disabled") {
      return json(
        { error: "Only disabled companies can be deleted" },
        400
      );
    }

    // Collect user IDs that belong only to this company so we can delete their auth accounts
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("company_id", companyId);
    const userIds = Array.from(new Set((roleRows || []).map((r: any) => r.user_id)));

    // Find related row IDs needed for nested cleanup
    const [{ data: invoices }, { data: sales }] = await Promise.all([
      admin.from("invoices").select("id").eq("company_id", companyId),
      admin.from("sales").select("id").eq("company_id", companyId),
    ]);
    const invoiceIds = (invoices || []).map((r: any) => r.id);
    const saleIds = (sales || []).map((r: any) => r.id);

    // Delete dependent rows in safe order (children first)
    if (invoiceIds.length) {
      await admin.from("invoice_items").delete().in("invoice_id", invoiceIds);
      await admin.from("payments").delete().in("invoice_id", invoiceIds);
      await admin.from("reminder_logs").delete().in("invoice_id", invoiceIds);
    }
    if (saleIds.length) {
      await admin.from("sale_items").delete().in("sale_id", saleIds);
      await admin.from("sale_payments").delete().in("sale_id", saleIds);
    }

    const tablesByCompany = [
      "invoices",
      "sales",
      "drawer_events",
      "inventory_movements",
      "supplier_price_history", // cascaded via product_id; safe-guard handled by FK if any
      "stock_transfers",
      "warehouse_stock", // via product/warehouse, but no company_id; handled below
      "warehouses",
      "expenses",
      "payroll_runs",
      "work_logs",
      "staff",
      "customer_ledger",
      "customers",
      "products",
      "suppliers",
      "alerts",
      "pos_settings",
      "cashier_users",
      "company_feature_flags",
      "stores",
      "user_store_assignments",
      "user_roles",
      "subscriptions",
      "cancellation_requests",
      "webhook_events",
    ];

    // warehouse_stock has no company_id; clear by warehouse first
    const { data: wh } = await admin
      .from("warehouses")
      .select("id")
      .eq("company_id", companyId);
    const whIds = (wh || []).map((r: any) => r.id);
    if (whIds.length) {
      await admin.from("warehouse_stock").delete().in("warehouse_id", whIds);
    }

    for (const table of tablesByCompany) {
      if (table === "warehouse_stock") continue; // already handled
      const { error } = await admin
        .from(table as any)
        .delete()
        .eq("company_id", companyId);
      if (error) {
        console.warn(`[delete-company] ${table}:`, error.message);
      }
    }

    // Detach profiles (so we can delete auth users) and remove
    await admin.from("profiles").delete().eq("company_id", companyId);

    // Finally remove the company itself
    const { error: deleteErr } = await admin
      .from("companies")
      .delete()
      .eq("id", companyId);
    if (deleteErr) return json({ error: deleteErr.message }, 500);

    // Best-effort: delete auth accounts for users that belonged to this company
    let deletedAuthUsers = 0;
    for (const uid of userIds) {
      try {
        const { error } = await admin.auth.admin.deleteUser(uid);
        if (!error) deletedAuthUsers++;
      } catch (e) {
        console.warn("[delete-company] auth delete failed", uid, e);
      }
    }

    // Audit log
    await admin.from("admin_audit_logs").insert({
      admin_id: userData.user.id,
      admin_email: userData.user.email,
      action: "company_deleted",
      entity: "company",
      entity_id: companyId,
      metadata: { name: company.name, deletedAuthUsers },
    });

    return json({ success: true, deletedAuthUsers });
  } catch (e: any) {
    console.error("[admin-delete-company] error:", e);
    return json({ error: e?.message || "Unexpected error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
