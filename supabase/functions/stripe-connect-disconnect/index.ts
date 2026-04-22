/**
 * stripe-connect-disconnect
 *
 * Lets a merchant OWNER unlink their Stripe Connect account from their Stokivo
 * company. We do NOT delete the Stripe account itself (the merchant keeps it on
 * Stripe and can manage it from dashboard.stripe.com); we only clear our local
 * `companies.stripe_account_id` reference so:
 *   - The Connect status flips to "Not connected" in Settings → Payments
 *   - New Terminal/checkout PaymentIntents stop routing to that account
 *   - The merchant can connect a different Stripe account if they want
 *
 * Owner-only: requires `owner` role in the company. Managers/staff cannot
 * disconnect payments.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Not authenticated" }, 401);

    const userId = userData.user.id;

    // Resolve company_id (profile first, then user_roles fallback).
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("company_id, role")
      .eq("user_id", userId)
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    const companyId = profile?.company_id ?? roleRow?.company_id;
    if (!companyId) return json({ error: "No company found" }, 400);

    // Owner-only check via the existing security-definer function.
    const { data: isOwner, error: roleErr } = await supabase.rpc("has_role_in_company", {
      _user_id: userId,
      _role: "owner",
      _company_id: companyId,
    });
    if (roleErr) return json({ error: "Permission check failed" }, 500);
    if (!isOwner) return json({ error: "Only the owner can disconnect Stripe" }, 403);

    // Clear the link. We intentionally do NOT touch the Stripe account itself —
    // the merchant retains full ownership at dashboard.stripe.com.
    const { error: updateErr } = await supabase
      .from("companies")
      .update({ stripe_account_id: null })
      .eq("id", companyId);

    if (updateErr) return json({ error: updateErr.message }, 500);

    return json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
});
