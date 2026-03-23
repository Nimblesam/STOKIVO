import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) {
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
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
    let businessType = "individual";
    let selectedCountry = "GB";
    try {
      const body = await req.json();
      if (body.business_type) businessType = body.business_type;
      if (body.country) selectedCountry = body.country;
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

    if (!accountId) {
      // Create a new Stripe Connect Express account
      const account = await stripe.accounts.create({
        type: "express",
        country: selectedCountry,
        email: company?.email || user.email,
        business_type: businessType as any,
        business_profile: {
          name: company?.name || undefined,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;

      // Save the account ID to the company
      await supabaseClient
        .from("companies")
        .update({ stripe_account_id: accountId })
        .eq("id", companyId);
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/settings?tab=payments&stripe_refresh=true`,
      return_url: `${origin}/settings?tab=payments&stripe_connected=true`,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: accountLink.url, accountId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("authorization") || message.includes("authenticated") ? 401 : 500;

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
