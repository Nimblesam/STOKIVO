import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const sig = req.headers.get("stripe-signature");
    const body = await req.text();
    
    // If no signature, this is a manual trigger — not a webhook
    if (!sig) {
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");

    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { customerId, companyId, type } = session.metadata || {};

      if (type === "ledger_payment" && customerId && companyId) {
        const amount = session.amount_total || 0;

        // Create PAYMENT ledger entry
        await supabase.from("customer_ledger").insert({
          customer_id: customerId,
          company_id: companyId,
          type: "PAYMENT",
          amount,
          description: `Stripe online payment (${session.payment_intent})`,
          reference_id: session.id,
        });

        // Recalculate balance
        const { data: entries } = await supabase.from("customer_ledger")
          .select("type, amount").eq("customer_id", customerId);
        let balance = 0;
        for (const e of entries || []) {
          if (e.type === "CHARGE") balance += e.amount;
          else balance -= e.amount;
        }
        await supabase.from("customers").update({ outstanding_balance: Math.max(0, balance) }).eq("id", customerId);

        console.log(`Ledger payment recorded: ${amount} for customer ${customerId}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Webhook error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
