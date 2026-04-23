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
 * Stripe Terminal — server-side reader operations.
 *
 * Why this exists:
 *   The Stripe JS Terminal SDK (`js.stripe.com/terminal/v1/`) cannot discover
 *   internet-connected smart readers (WisePOS E, BBPOS WisePad 3 with the
 *   Stripe Reader app, S700 etc.). Those readers are managed entirely
 *   server-side via the Terminal Readers API:
 *     - GET  /v1/terminal/readers                                → list
 *     - POST /v1/terminal/readers                                → register (pairing code)
 *     - POST /v1/terminal/readers/{id}/process_payment_intent    → push amount
 *     - POST /v1/terminal/readers/{id}/cancel_action             → cancel
 *     - POST /v1/terminal/readers/{id}                           → update label
 *     - DELETE /v1/terminal/readers/{id}                         → unregister
 *
 * All operations are scoped to the merchant's connected Stripe account.
 * Body shape: { action: "list" | "register" | "process" | "cancel" | "rename" | "delete" | "get", ... }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return jsonResp({ error: "Method not allowed" }, 405);
  }

  try {
    // ---- Auth ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAnon.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    // ---- Stripe ----
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // ---- Connected account lookup ----
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { data: profile } = await supabaseAdmin
      .from("profiles").select("company_id").eq("user_id", user.id).maybeSingle();
    let connectedAccountId: string | null = null;
    if (profile?.company_id) {
      const { data: company } = await supabaseAdmin
        .from("companies").select("stripe_account_id").eq("id", profile.company_id).maybeSingle();
      if (company?.stripe_account_id) connectedAccountId = company.stripe_account_id;
    }
    const reqOpts: Stripe.RequestOptions = connectedAccountId ? { stripeAccount: connectedAccountId } : {};

    // ---- Dispatch ----
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "list");

    switch (action) {
      case "list": {
        // List internet readers (online + offline). We surface status so the
        // client can disable greyed-out readers without a separate API call.
        const list = await stripe.terminal.readers.list({ limit: 100 }, reqOpts);
        return jsonResp({
          readers: list.data.map((r) => ({
            id: r.id,
            label: r.label || r.serial_number || "Reader",
            status: r.status,                  // "online" | "offline"
            device_type: r.device_type,        // e.g. "stripe_s700", "bbpos_wisepos_e"
            serial_number: r.serial_number,
            location: r.location,
            ip_address: r.ip_address,
            action: r.action,                  // current in-flight action (if any)
          })),
          connected_account: connectedAccountId,
        });
      }

      case "get": {
        const readerId = String(body.reader_id || "");
        if (!readerId) throw new Error("reader_id required");
        const r = await stripe.terminal.readers.retrieve(readerId, reqOpts);
        return jsonResp({ reader: serializeReader(r) });
      }

      case "register": {
        // The merchant types the pairing code shown on the reader's screen.
        const registration_code = String(body.registration_code || "").trim();
        const label = String(body.label || "").trim() || undefined;
        const location = String(body.location || "").trim();
        if (!registration_code) throw new Error("registration_code required");
        if (!location || !location.startsWith("tml_")) throw new Error("location (tml_...) required");
        const reader = await stripe.terminal.readers.create({
          registration_code, label, location,
        }, reqOpts);
        return jsonResp({ reader: serializeReader(reader) });
      }

      case "rename": {
        const readerId = String(body.reader_id || "");
        const label = String(body.label || "").trim();
        if (!readerId) throw new Error("reader_id required");
        if (!label) throw new Error("label required");
        const r = await stripe.terminal.readers.update(readerId, { label }, reqOpts);
        return jsonResp({ reader: serializeReader(r) });
      }

      case "delete": {
        const readerId = String(body.reader_id || "");
        if (!readerId) throw new Error("reader_id required");
        await stripe.terminal.readers.del(readerId, reqOpts);
        return jsonResp({ ok: true });
      }

      case "process": {
        // Push a PaymentIntent to a specific reader. Stripe will display the
        // amount on the reader's screen and prompt the customer to tap/insert.
        const readerId = String(body.reader_id || "");
        const amount = Number(body.amount || 0);
        const currency = String(body.currency || "gbp").toLowerCase();
        if (!readerId) throw new Error("reader_id required");
        if (!amount || amount <= 0) throw new Error("amount required");

        // 1) Create the PI on the connected account.
        const pi = await stripe.paymentIntents.create({
          amount,
          currency,
          payment_method_types: ["card_present"],
          capture_method: "automatic",
          metadata: { source: "stokivo_pos_internet_reader" },
        }, reqOpts);

        // 2) Hand it to the reader.
        const reader = await stripe.terminal.readers.processPaymentIntent(readerId, {
          payment_intent: pi.id,
        }, reqOpts);

        return jsonResp({
          payment_intent_id: pi.id,
          reader: serializeReader(reader),
        });
      }

      case "cancel": {
        const readerId = String(body.reader_id || "");
        if (!readerId) throw new Error("reader_id required");
        const r = await stripe.terminal.readers.cancelAction(readerId, undefined, reqOpts);
        return jsonResp({ reader: serializeReader(r) });
      }

      case "poll": {
        // Poll a PaymentIntent + reader to know when the customer finished.
        const piId = String(body.payment_intent_id || "");
        const readerId = String(body.reader_id || "");
        if (!piId) throw new Error("payment_intent_id required");
        const pi = await stripe.paymentIntents.retrieve(piId, reqOpts);
        let reader: Stripe.Terminal.Reader | null = null;
        if (readerId) {
          try { reader = await stripe.terminal.readers.retrieve(readerId, reqOpts); }
          catch { /* reader may have been removed */ }
        }
        return jsonResp({
          payment_intent: { id: pi.id, status: pi.status, last_payment_error: pi.last_payment_error?.message ?? null },
          reader: reader ? serializeReader(reader) : null,
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[terminal-readers]", message);
    return jsonResp({ error: message }, 500);
  }
});

function serializeReader(r: Stripe.Terminal.Reader) {
  return {
    id: r.id,
    label: r.label || r.serial_number || "Reader",
    status: r.status,
    device_type: r.device_type,
    serial_number: r.serial_number,
    location: r.location,
    ip_address: r.ip_address,
    action: r.action,
  };
}

function jsonResp(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
