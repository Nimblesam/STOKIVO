import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * POST /create-terminal-payment
 *
 * Creates a Stripe Terminal PaymentIntent for an in-person charge.
 *
 * Stripe Connect routing:
 *   We look up the caller's company.stripe_account_id and create the
 *   PaymentIntent on that connected account using the Stripe-Account header.
 *   This is REQUIRED for funds to settle into the merchant's bank — and it's
 *   required for Tap to Pay on Android (which always operates on a connected
 *   account in our Connect model).
 *
 *   If the merchant has not yet connected Stripe, we transparently fall back
 *   to creating the PI on the platform account so existing flows keep working
 *   (e.g. internal testing). This preserves the previous behaviour.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("Not authenticated");

    const { amount, currency } = await req.json();
    if (!amount || amount <= 0) throw new Error("Invalid amount");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // ---- Look up the merchant's connected account (if any) ----------------
    let connectedAccountId: string | null = null;
    try {
      // Service-role client to bypass RLS for the lookup.
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile?.company_id) {
        const { data: company } = await supabaseAdmin
          .from("companies")
          .select("stripe_account_id")
          .eq("id", profile.company_id)
          .maybeSingle();
        if (company?.stripe_account_id) {
          connectedAccountId = company.stripe_account_id;
        }
      }
    } catch (lookupErr) {
      console.warn("[create-terminal-payment] Connect lookup failed:", lookupErr);
    }

    // ---- Create the PaymentIntent ----------------------------------------
    const piParams: Stripe.PaymentIntentCreateParams = {
      amount,
      currency: currency || "gbp",
      payment_method_types: ["card_present"],
      capture_method: "automatic",
    };

    const piOptions: Stripe.RequestOptions = connectedAccountId
      ? { stripeAccount: connectedAccountId }
      : {};

    const paymentIntent = await stripe.paymentIntents.create(piParams, piOptions);

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        id: paymentIntent.id,
        payment_intent_id: paymentIntent.id,
        connected_account: connectedAccountId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Terminal payment error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
