import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { email, password } = await req.json();
    if (!email || !password) throw new Error("Email and password required");

    // Check admin_users table
    const { data: admin, error: adminErr } = await adminClient
      .from("admin_users")
      .select("id, email, role, status, full_name, failed_attempts, locked_until, last_login_at")
      .eq("email", email)
      .single();

    if (!admin || adminErr) {
      // Don't reveal whether the email exists
      console.log(`[ADMIN-AUTH] Login attempt for unknown email: ${email}`);
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    if (admin.status !== "active") {
      console.log(`[ADMIN-AUTH] Login attempt for non-active admin: ${email} (${admin.status})`);
      return new Response(JSON.stringify({ error: "Account not active. Contact a super admin." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Check account lock
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      const mins = Math.ceil((new Date(admin.locked_until).getTime() - Date.now()) / 60000);
      await adminClient.from("admin_audit_logs").insert({
        admin_id: admin.id, admin_email: email,
        action: "admin_login_failed_locked",
        metadata: { locked_minutes_remaining: mins },
      });
      return new Response(JSON.stringify({ error: `Account locked. Try again in ${mins} minutes.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 423,
      });
    }

    // Attempt sign in via Supabase Auth
    const { data: sessionData, error: signInError } = await anonClient.auth.signInWithPassword({ email, password });

    if (signInError) {
      const newAttempts = (admin.failed_attempts || 0) + 1;
      const updateData: Record<string, any> = { failed_attempts: newAttempts };

      if (newAttempts >= 10) {
        updateData.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      }

      await adminClient.from("admin_users").update(updateData).eq("id", admin.id);
      await adminClient.from("admin_audit_logs").insert({
        admin_id: admin.id, admin_email: email,
        action: "admin_login_failed",
        metadata: { attempts: newAttempts, locked: newAttempts >= 10 },
      });

      console.log(`[ADMIN-AUTH] Login failed for ${email}. Attempt ${newAttempts}/10`);

      return new Response(JSON.stringify({
        error: newAttempts >= 10 ? "Account locked for 30 minutes due to too many failed attempts" : "Invalid credentials",
        attempts_remaining: Math.max(0, 10 - newAttempts),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Success! Reset failed attempts, update last_login
    await adminClient.from("admin_users").update({
      failed_attempts: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
    }).eq("id", admin.id);

    await adminClient.from("admin_audit_logs").insert({
      admin_id: admin.id, admin_email: email,
      action: "admin_login_success",
    });

    console.log(`[ADMIN-AUTH] Login successful for ${email}`);

    return new Response(JSON.stringify({
      session: sessionData.session,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        full_name: admin.full_name,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ADMIN-AUTH] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
