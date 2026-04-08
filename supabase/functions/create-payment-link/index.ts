import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_FEE_PERCENT = 0.5; // 0.5%

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
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

    const body = await req.json();
    const { invoiceId, customerId: ledgerCustomerId } = body;

    // Derive company from user profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const companyId = profile?.company_id;
    if (!companyId) {
      return new Response(JSON.stringify({ error: "No company found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Get company details
    const { data: company } = await supabaseClient
      .from("companies")
      .select("stripe_account_id, currency, name")
      .eq("id", companyId)
      .single();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const companyCurrency = (company?.currency || "GBP").toLowerCase();

    // MODE 1: Ledger-based payment link (for credit ledger)
    if (ledgerCustomerId) {
      const { data: customer } = await supabaseClient
        .from("customers")
        .select("id, name, email, company_id")
        .eq("id", ledgerCustomerId)
        .eq("company_id", companyId)
        .single();

      if (!customer) {
        return new Response(JSON.stringify({ error: "Customer not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }

      // Calculate balance from ledger
      const { data: entries } = await supabaseClient.from("customer_ledger")
        .select("type, amount").eq("customer_id", ledgerCustomerId);

      let balance = 0;
      for (const e of entries || []) {
        if (e.type === "CHARGE") balance += e.amount;
        else balance -= e.amount;
      }

      if (balance <= 0) {
        return new Response(JSON.stringify({ error: "No outstanding balance" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const platformFee = Math.round(balance * (PLATFORM_FEE_PERCENT / 100));

      const sessionParams: any = {
        line_items: [{
          price_data: {
            currency: companyCurrency,
            product_data: { name: `Outstanding balance for ${customer.name}` },
            unit_amount: balance,
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${req.headers.get("origin")}/credit-ledger?paid=true`,
        cancel_url: `${req.headers.get("origin")}/credit-ledger`,
        metadata: { customerId: customer.id, companyId, type: "ledger_payment" },
      };

      if (customer.email) sessionParams.customer_email = customer.email;

      if (company?.stripe_account_id) {
        sessionParams.payment_intent_data = {
          application_fee_amount: platformFee,
          transfer_data: { destination: company.stripe_account_id },
        };
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      return new Response(JSON.stringify({ url: session.url, balance, platformFee }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE 2: Invoice-based payment link (existing behavior)
    if (!invoiceId || typeof invoiceId !== "string") {
      return new Response(JSON.stringify({ error: "invoiceId or customerId is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { data: invoice, error: invoiceError } = await supabaseClient
      .from("invoices")
      .select("id, total, status, company_id, customer_id")
      .eq("id", invoiceId)
      .eq("company_id", companyId)
      .single();

    if (invoiceError || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found or access denied" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (invoice.status === "paid") {
      return new Response(JSON.stringify({ error: "Invoice is already paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const amount = invoice.total;
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid invoice amount" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { data: customer } = await supabaseClient
      .from("customers")
      .select("email")
      .eq("id", invoice.customer_id)
      .maybeSingle();

    const platformFee = Math.round(amount * (PLATFORM_FEE_PERCENT / 100));

    const sessionParams: any = {
      line_items: [{
        price_data: {
          currency: companyCurrency,
          product_data: { name: `Invoice ${invoiceId.substring(0, 8)}` },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/invoices?paid=${invoiceId}`,
      cancel_url: `${req.headers.get("origin")}/invoices`,
      metadata: { invoiceId, companyId },
    };

    if (customer?.email) sessionParams.customer_email = customer.email;

    if (company?.stripe_account_id) {
      sessionParams.payment_intent_data = {
        application_fee_amount: platformFee,
        transfer_data: { destination: company.stripe_account_id },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({
      url: session.url, platformFee, netAmount: amount - platformFee,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
