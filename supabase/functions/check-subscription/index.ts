import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw userError;
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    // Resolve company for this user
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const companyId = profile?.company_id ?? null;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    let status: string | null = null;
    let productId: string | null = null;
    let priceId: string | null = null;
    let subscriptionEnd: string | null = null;
    let trialEnd: string | null = null;
    let cancelAtPeriodEnd = false;
    let hasActiveSub = false;
    let isTrialing = false;

    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 10,
      });

      // Prefer active/trialing; otherwise the most recent subscription
      const validSub =
        subs.data.find((s) => s.status === "active" || s.status === "trialing") ??
        subs.data.sort((a, b) => b.created - a.created)[0];

      if (validSub) {
        status = validSub.status;
        hasActiveSub = status === "active" || status === "trialing";
        isTrialing = status === "trialing";
        subscriptionEnd = validSub.current_period_end
          ? new Date(validSub.current_period_end * 1000).toISOString()
          : null;
        trialEnd = validSub.trial_end
          ? new Date(validSub.trial_end * 1000).toISOString()
          : null;
        cancelAtPeriodEnd = !!validSub.cancel_at_period_end;
        productId = validSub.items.data[0].price.product as string;
        priceId = validSub.items.data[0].price.id;
      }
    }

    // Sync to database — Stripe is the source of truth
    if (companyId) {
      await supabaseAdmin
        .from("subscriptions")
        .update({
          stripe_subscription_status: status,
          trial_ends_at: trialEnd,
          current_period_end: subscriptionEnd,
          cancel_at_period_end: cancelAtPeriodEnd,
          expires_at: subscriptionEnd,
        })
        .eq("company_id", companyId);
    }

    return new Response(
      JSON.stringify({
        subscribed: hasActiveSub,
        status,
        product_id: productId,
        price_id: priceId,
        subscription_end: subscriptionEnd,
        is_trialing: isTrialing,
        trial_end: trialEnd,
        cancel_at_period_end: cancelAtPeriodEnd,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
