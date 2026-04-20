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
    const body = await req.json();
    const { action, token, password, full_name } = body;

    if (action === "validate") {
      if (!token) throw new Error("Token required");
      const tokenHash = await hashToken(token);

      const { data: invite, error } = await supabase
        .from("admin_invites")
        .select("id, email, role, expires_at, used_at")
        .eq("token_hash", tokenHash)
        .single();

      if (!invite || error) {
        return new Response(JSON.stringify({ valid: false, error: "Invalid invite token" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      if (invite.used_at) {
        return new Response(JSON.stringify({ valid: false, error: "This invite has already been used" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      if (new Date(invite.expires_at) < new Date()) {
        return new Response(JSON.stringify({ valid: false, error: "This invite has expired" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      return new Response(JSON.stringify({
        valid: true,
        email: invite.email,
        role: invite.role,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "complete") {
      if (!token || !password) throw new Error("Token and password required");
      if (password.length < 8) throw new Error("Password must be at least 8 characters");

      const tokenHash = await hashToken(token);

      const { data: invite, error: invErr } = await supabase
        .from("admin_invites")
        .select("id, email, role, expires_at, used_at")
        .eq("token_hash", tokenHash)
        .single();

      if (!invite || invErr) throw new Error("Invalid invite token");
      if (invite.used_at) throw new Error("This invite has already been used");
      if (new Date(invite.expires_at) < new Date()) throw new Error("This invite has expired");

      // Create auth user (or find existing)
      let userId: string;
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
      });

      if (authError) {
        if (authError.message.includes("already been registered") || authError.message.includes("already exists")) {
          // Find existing user and update password
          const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
          const found = listData?.users?.find((u: any) => u.email === invite.email);
          if (!found) throw new Error("Could not find user account");
          userId = found.id;
          // Update password
          await supabase.auth.admin.updateUserById(userId, { password });
        } else {
          throw authError;
        }
      } else {
        userId = authUser.user.id;
      }

      // Create admin_users record
      const { error: insertErr } = await supabase.from("admin_users").insert({
        user_id: userId,
        email: invite.email,
        role: invite.role,
        status: "active",
        full_name: full_name || null,
      });

      if (insertErr) {
        // If already exists, update
        if (insertErr.message.includes("duplicate")) {
          await supabase.from("admin_users")
            .update({ role: invite.role, status: "active", full_name: full_name || null })
            .eq("email", invite.email);
        } else {
          throw insertErr;
        }
      }

      // Mark invite used
      await supabase.from("admin_invites")
        .update({ used_at: new Date().toISOString() })
        .eq("id", invite.id);

      // Audit log
      await supabase.from("admin_audit_logs").insert({
        admin_email: invite.email,
        action: "admin_created",
        entity: "admin_user",
        metadata: { role: invite.role, method: "invite" },
      });

      console.log(`[ADMIN-SETUP] Admin account created for ${invite.email} with role ${invite.role}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action. Use 'validate' or 'complete'.");
  } catch (error) {
    console.error("[ADMIN-SETUP] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
