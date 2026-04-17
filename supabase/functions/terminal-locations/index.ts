import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/**
 * Stripe Terminal Locations
 *
 *  GET  -> list existing locations for this Stripe account
 *  POST -> create a new location { display_name, address: {...} }
 *
 * A `locationId` (tml_...) is required for Tap to Pay readers.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    if (req.method === "GET") {
      const locations = await stripe.terminal.locations.list({ limit: 100 });
      return new Response(
        JSON.stringify({
          locations: locations.data.map((l) => ({
            id: l.id,
            display_name: l.display_name,
            address: l.address,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const display_name = typeof body.display_name === "string" ? body.display_name.trim() : "";
      const address = body.address;

      if (!display_name) throw new Error("display_name is required");
      if (!address || typeof address !== "object" || !address.country) {
        throw new Error("address with at least 'country' is required");
      }

      const location = await stripe.terminal.locations.create({
        display_name,
        address: {
          line1: address.line1 ?? "",
          line2: address.line2 ?? undefined,
          city: address.city ?? undefined,
          state: address.state ?? undefined,
          postal_code: address.postal_code ?? undefined,
          country: address.country,
        },
      });

      return new Response(
        JSON.stringify({
          id: location.id,
          display_name: location.display_name,
          address: location.address,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Terminal locations error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
