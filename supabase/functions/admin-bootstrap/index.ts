import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Check if any active super_admin exists
    const { data: existing } = await supabase
      .from("admin_users")
      .select("id")
      .eq("role", "super_admin")
      .eq("status", "active")
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ needed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = Deno.env.get("BOOTSTRAP_SUPERADMIN_EMAIL");
    const password = Deno.env.get("BOOTSTRAP_SUPERADMIN_PASSWORD");

    if (!email || !password) {
      return new Response(JSON.stringify({
        needed: true,
        error: "Set BOOTSTRAP_SUPERADMIN_EMAIL and BOOTSTRAP_SUPERADMIN_PASSWORD secrets to bootstrap the first admin.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ needed: true, error: "Bootstrap password must be at least 8 characters" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Try to create auth user
    let userId: string;
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes("already been registered") || authError.message.includes("already exists")) {
        // Find existing user
        const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const found = listData?.users?.find((u: any) => u.email === email);
        if (!found) throw new Error("Could not find existing user with bootstrap email");
        userId = found.id;
      } else {
        throw authError;
      }
    } else {
      userId = authUser.user.id;
    }

    // Check if admin_users record already exists for this user_id
    const { data: existingAdmin } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!existingAdmin) {
      await supabase.from("admin_users").insert({
        user_id: userId,
        email,
        role: "super_admin",
        status: "active",
      });
    } else {
      await supabase.from("admin_users")
        .update({ role: "super_admin", status: "active" })
        .eq("user_id", userId);
    }

    // Audit log
    await supabase.from("admin_audit_logs").insert({
      admin_email: email,
      action: "admin_bootstrapped",
      metadata: { method: "env_vars" },
    });

    console.log(`[ADMIN-BOOTSTRAP] Super admin bootstrapped: ${email}`);

    return new Response(JSON.stringify({ needed: false, bootstrapped: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ADMIN-BOOTSTRAP] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
