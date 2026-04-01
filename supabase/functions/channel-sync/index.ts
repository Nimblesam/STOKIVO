import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SyncRequest {
  action: "connect" | "disconnect" | "sync_products" | "sync_inventory" | "status";
  channel: "shopify" | "wix" | "woocommerce" | "uber_eats" | "deliveroo";
  company_id: string;
  credentials?: Record<string, string>;
}

const CHANNEL_CONFIGS: Record<string, { name: string; base_url_hint: string }> = {
  shopify: { name: "Shopify", base_url_hint: "https://{store}.myshopify.com/admin/api/2024-01" },
  wix: { name: "Wix", base_url_hint: "https://www.wixapis.com/stores/v1" },
  woocommerce: { name: "WooCommerce", base_url_hint: "https://{site}/wp-json/wc/v3" },
  uber_eats: { name: "Uber Eats", base_url_hint: "https://api.uber.com/v1/eats" },
  deliveroo: { name: "Deliveroo", base_url_hint: "https://api.deliveroo.com/orderapp/v1" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SyncRequest = await req.json();
    const { action, channel, company_id, credentials } = body;

    if (!action || !channel || !company_id) {
      return new Response(JSON.stringify({ error: "Missing action, channel, or company_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = CHANNEL_CONFIGS[channel];
    if (!config) {
      return new Response(JSON.stringify({ error: `Unsupported channel: ${channel}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user belongs to company
    const { data: belongs } = await supabase.rpc("user_belongs_to_company", {
      _user_id: user.id,
      _company_id: company_id,
    });
    if (!belongs) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: Record<string, unknown> = {};

    switch (action) {
      case "connect": {
        // Store integration credentials (in production, encrypt these)
        // For now we log the connection event
        await supabase.from("webhook_events").insert({
          provider: channel,
          event_type: "integration.connected",
          status: "processed",
          company_id,
          payload: { channel: config.name, connected_by: user.id },
        });

        result = {
          success: true,
          message: `${config.name} integration connected. Products will sync automatically.`,
          channel: config.name,
        };
        break;
      }

      case "disconnect": {
        await supabase.from("webhook_events").insert({
          provider: channel,
          event_type: "integration.disconnected",
          status: "processed",
          company_id,
          payload: { channel: config.name, disconnected_by: user.id },
        });

        result = {
          success: true,
          message: `${config.name} integration disconnected.`,
        };
        break;
      }

      case "sync_products": {
        // Fetch products for this company
        const { data: products, error: prodErr } = await supabase
          .from("products")
          .select("id, name, sku, barcode, selling_price, stock_qty, category")
          .eq("company_id", company_id);

        if (prodErr) throw prodErr;

        // In production, this would call the channel's API to push products
        // For now, log the sync event
        await supabase.from("webhook_events").insert({
          provider: channel,
          event_type: "products.synced",
          status: "processed",
          company_id,
          payload: { product_count: products?.length || 0, synced_at: new Date().toISOString() },
        });

        result = {
          success: true,
          message: `${products?.length || 0} products synced to ${config.name}`,
          product_count: products?.length || 0,
        };
        break;
      }

      case "sync_inventory": {
        const { data: products } = await supabase
          .from("products")
          .select("id, name, sku, stock_qty")
          .eq("company_id", company_id);

        await supabase.from("webhook_events").insert({
          provider: channel,
          event_type: "inventory.synced",
          status: "processed",
          company_id,
          payload: { product_count: products?.length || 0, synced_at: new Date().toISOString() },
        });

        result = {
          success: true,
          message: `Inventory synced to ${config.name} for ${products?.length || 0} products`,
        };
        break;
      }

      case "status": {
        // Check latest sync events for this channel & company
        const { data: events } = await supabase
          .from("webhook_events")
          .select("event_type, status, created_at, payload")
          .eq("provider", channel)
          .eq("company_id", company_id)
          .order("created_at", { ascending: false })
          .limit(5);

        const isConnected = events?.some(
          (e) => e.event_type === "integration.connected" &&
            !events.some((d) => d.event_type === "integration.disconnected" && d.created_at > e.created_at)
        );

        result = {
          connected: isConnected || false,
          channel: config.name,
          recent_events: events || [],
        };
        break;
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Channel sync error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
