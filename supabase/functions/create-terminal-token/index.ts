import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * POST /terminal/connection_token
 *
 * Returns a short-lived Stripe Terminal connection token used by the
 * Stripe Terminal SDK (Tap to Pay on Android, BBPOS, Verifone, etc.)
 * to authenticate with Stripe.
 *
 * Security:
 *  - Stripe secret key never leaves the server.
 *  - Caller must be authenticated (Supabase JWT verified here).
 *  - Token is short-lived and single-use; the SDK requests new ones as needed.
 *
 * Response: { "secret": "pst_..." } (Stripe returns a token starting with `pst_`)
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Optional: scope token to a specific reader location (recommended for Tap to Pay).
    let location: string | undefined;
    try {
      const body = await req.json().catch(() => ({}));
      if (body && typeof body.location === "string" && body.location.startsWith("tml_")) {
        location = body.location;
      }
    } catch (_) {
      // no body — fine
    }

    const connectionToken = await stripe.terminal.connectionTokens.create(
      location ? { location } : undefined
    );

    return new Response(JSON.stringify({ secret: connectionToken.secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Terminal token error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
