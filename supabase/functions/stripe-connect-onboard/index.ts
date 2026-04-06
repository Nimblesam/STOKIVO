import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Please sign in again and retry connecting your bank account." });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) {
      return jsonResponse({ error: "Your session expired. Please sign in again and retry." });
    }
    const user = userData.user;

    // Get company_id from profile (fallback to roles)
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: roleRow } = await supabaseClient
      .from("user_roles")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    const companyId = profile?.company_id ?? roleRow?.company_id;
    if (!companyId) throw new Error("No company found");

    // Parse request body for account preferences
    let selectedCountry = "GB";
    let requestedReturnUrl: string | null = null;
    let requestedRefreshUrl: string | null = null;
    try {
      const body = await req.json();
      if (body.country) selectedCountry = body.country;
      if (body.return_url) requestedReturnUrl = body.return_url;
      if (body.refresh_url) requestedRefreshUrl = body.refresh_url;
    } catch { /* no body is fine */ }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if company already has a Stripe account
    const { data: company } = await supabaseClient
      .from("companies")
      .select("stripe_account_id, name, email")
      .eq("id", companyId)
      .single();

    let accountId = company?.stripe_account_id;

    const createExpressAccount = async () => {
      const account = await stripe.accounts.create({
        type: "express",
        country: selectedCountry,
        email: company?.email || user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      await supabaseClient
        .from("companies")
        .update({ stripe_account_id: account.id })
        .eq("id", companyId);

      return account.id;
    };

    if (accountId) {
      try {
        await stripe.accounts.retrieve(accountId);
      } catch {
        accountId = null;
      }
    }

    if (!accountId) {
      accountId = await createExpressAccount();
    }

    const origin = req.headers.get("origin") || "https://stokivo.com";
    const returnUrl = requestedReturnUrl || `${origin}/settings?tab=payments&stripe_connected=true`;
    const refreshUrl = requestedRefreshUrl || `${origin}/settings?tab=payments&stripe_refresh=true`;

    // Create an account link for onboarding
    let accountLink;
    try {
      accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      });
    } catch {
      accountId = await createExpressAccount();
      accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      });
    }

    return jsonResponse({ url: accountLink.url, accountId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message });
  }
});
