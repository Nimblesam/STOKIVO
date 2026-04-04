import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_HIERARCHY: Record<string, number> = {
  starter: 0,
  growth: 1,
  pro: 2,
};

const PLAN_LIMITS: Record<string, { maxUsers: number; maxProducts: number; multiStore: boolean }> = {
  starter: { maxUsers: 2, maxProducts: 500, multiStore: false },
  growth: { maxUsers: 8, maxProducts: 999999, multiStore: true },
  pro: { maxUsers: 999999, maxProducts: 999999, multiStore: true },
};

const FEATURE_MIN_PLAN: Record<string, string> = {
  multi_location: "growth",
  expiry_alerts: "growth",
  ai_insights: "growth",
  barcode_generation: "growth",
  invoicing: "starter",
  supplier_management: "starter",
  ai_forecasting: "pro",
  custom_domain: "pro",
  multi_warehouse: "pro",
  full_automation: "pro",
  advanced_analytics: "growth",
  stripe_payouts: "starter",
  rbac_advanced: "pro",
};

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("company_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: "No company found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const companyId = profile.company_id;

    const { data: company } = await supabaseClient
      .from("companies")
      .select("plan")
      .eq("id", companyId)
      .single();

    const currentPlan = company?.plan || "starter";
    const currentLevel = PLAN_HIERARCHY[currentPlan] ?? 0;
    const limits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.starter;

    const body = await req.json().catch(() => ({}));
    const { feature, action } = body;

    // Check a specific limit action
    if (action === "add_product") {
      const { count } = await supabaseClient
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);
      const productCount = count ?? 0;
      const allowed = productCount < limits.maxProducts;
      return new Response(JSON.stringify({
        allowed,
        current_count: productCount,
        max: limits.maxProducts,
        current_plan: currentPlan,
        upgrade_to: allowed ? null : "growth",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "add_user") {
      const { count } = await supabaseClient
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("active", true);
      const userCount = count ?? 0;
      const allowed = userCount < limits.maxUsers;
      return new Response(JSON.stringify({
        allowed,
        current_count: userCount,
        max: limits.maxUsers,
        current_plan: currentPlan,
        upgrade_to: allowed ? null : (currentPlan === "starter" ? "growth" : "pro"),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "add_store") {
      if (!limits.multiStore) {
        return new Response(JSON.stringify({
          allowed: false,
          current_plan: currentPlan,
          upgrade_to: "growth",
          reason: "Multi-store requires Growth plan or above",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }
      return new Response(JSON.stringify({ allowed: true, current_plan: currentPlan }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check specific feature
    if (feature) {
      const requiredPlan = FEATURE_MIN_PLAN[feature];
      if (!requiredPlan) {
        return new Response(JSON.stringify({ error: "Unknown feature" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      const requiredLevel = PLAN_HIERARCHY[requiredPlan] ?? 0;
      const allowed = currentLevel >= requiredLevel;

      return new Response(JSON.stringify({
        allowed,
        current_plan: currentPlan,
        required_plan: requiredPlan,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return full plan info
    const allowedFeatures: Record<string, boolean> = {};
    for (const [feat, minPlan] of Object.entries(FEATURE_MIN_PLAN)) {
      allowedFeatures[feat] = currentLevel >= (PLAN_HIERARCHY[minPlan] ?? 0);
    }

    return new Response(JSON.stringify({
      current_plan: currentPlan,
      limits,
      features: allowedFeatures,
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
