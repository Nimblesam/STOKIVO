import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, teya-signature",
};

/**
 * Teya webhook scaffold.
 *
 * To activate:
 *  1. Add secret TEYA_WEBHOOK_SECRET.
 *  2. Implement signature verification using Teya's documented HMAC scheme.
 *  3. On confirmed payment, insert into customer_ledger / update sales as the
 *     existing stripe-ledger-webhook does for Stripe.
 *
 * Until configured, this endpoint logs the event and returns 202 so retries
 * back off cleanly without persisting unverified data.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const secret = Deno.env.get("TEYA_WEBHOOK_SECRET");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("teya-signature");

    // Always log the inbound event for diagnostics, even before activation.
    await supabase.from("webhook_events").insert({
      provider: "teya",
      event_type: "incoming",
      status: secret ? "received" : "ignored_unconfigured",
      payload: safeJson(body),
    });

    if (!secret) {
      return new Response(
        JSON.stringify({ accepted: false, reason: "Teya provider not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 202 },
      );
    }

    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing teya-signature header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // TODO: verify HMAC signature using `secret` and Teya's documented algorithm,
    // then handle event types (payment.succeeded, payment.failed, refund.created…).

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

function safeJson(body: string): unknown {
  try { return JSON.parse(body); } catch { return { raw: body }; }
}
