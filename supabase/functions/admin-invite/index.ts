import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Validate caller is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) throw new Error("Unauthorized");

    const { data: caller } = await supabase
      .from("admin_users")
      .select("id, email, role, status")
      .eq("user_id", userData.user.id)
      .eq("status", "active")
      .eq("role", "super_admin")
      .single();

    if (!caller) throw new Error("Super admin access required");

    const { email, role } = await req.json();
    if (!email || !role) throw new Error("Email and role required");
    if (!["super_admin", "support_admin"].includes(role)) throw new Error("Invalid role");

    // Check if admin already exists
    const { data: existing } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", email)
      .single();

    if (existing) throw new Error("An admin with this email already exists");

    // Generate secure token
    const rawToken = crypto.randomUUID() + "-" + crypto.randomUUID();
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

    // Create invite record
    await supabase.from("admin_invites").insert({
      email,
      role,
      token_hash: tokenHash,
      expires_at: expiresAt,
      invited_by: caller.id,
    });

    // Audit log
    await supabase.from("admin_audit_logs").insert({
      admin_id: caller.id,
      admin_email: caller.email,
      action: "admin_invite_sent",
      entity: "admin_invite",
      metadata: { invited_email: email, role },
    });

    const origin = req.headers.get("origin") || "";
    const inviteLink = `${origin}/admin/setup?token=${rawToken}`;

    console.log(`[ADMIN-INVITE] Invite link for ${email}: ${inviteLink}`);

    return new Response(JSON.stringify({
      success: true,
      invite_link: inviteLink,
      expires_in_minutes: 30,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ADMIN-INVITE] Error:", error);
    const status = error.message.includes("Unauthorized") ? 401
      : error.message.includes("Super admin") ? 403 : 400;
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
