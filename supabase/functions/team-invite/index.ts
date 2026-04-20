import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const allowedInviteRoles = new Set(["staff", "manager"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // Used only to send the magic-link email via the auth system
  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const caller = userData.user;

    const { email, role } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedRole = String(role || "staff").trim();

    if (!normalizedEmail) throw new Error("Email is required");
    if (!allowedInviteRoles.has(normalizedRole)) throw new Error("Invalid role");

    // Determine caller company + authorization (owner/manager)
    const { data: callerRoleRow } = await supabaseAdmin
      .from("user_roles")
      .select("company_id, role")
      .eq("user_id", caller.id)
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const callerCompanyId = callerRoleRow?.company_id;
    const callerRole = callerRoleRow?.role;

    if (!callerCompanyId) throw new Error("No company found for your account");
    if (!(callerRole === "owner" || callerRole === "manager")) throw new Error("Not allowed");

    const origin = req.headers.get("origin") || "http://localhost:5173";

    // 1) Try creating an auth invite (sends email automatically)
    let targetUserId: string | null = null;
    let mode: "invite" | "magiclink" = "invite";

    const { data: invitedUser, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo: `${origin}/set-password`,
        data: { company_id: callerCompanyId, invited_role: normalizedRole },
      },
    );

    if (!inviteErr && invitedUser?.user?.id) {
      targetUserId = invitedUser.user.id;
      mode = "invite";
    } else {
      // 2) If already registered, add them to the team + send a magic link email
      const message = inviteErr?.message || "";
      if (!message.toLowerCase().includes("already") && !message.toLowerCase().includes("registered")) {
        throw new Error(message || "Failed to invite user");
      }

      const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) throw listErr;

      const found = (listData?.users || []).find((u: any) => String(u.email || "").toLowerCase() === normalizedEmail);
      if (!found?.id) throw new Error("User exists but could not be located");

      targetUserId = found.id;
      mode = "magiclink";

      const { error: otpErr } = await supabaseAnon.auth.signInWithOtp({
        email: normalizedEmail,
        options: { emailRedirectTo: `${origin}/set-password` },
      });
      if (otpErr) throw otpErr;
    }

    // Upsert role membership for this company
    const { data: existingMembership } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", targetUserId)
      .eq("company_id", callerCompanyId)
      .limit(1)
      .maybeSingle();

    if (existingMembership?.id) {
      const { error: updErr } = await supabaseAdmin
        .from("user_roles")
        .update({ role: normalizedRole, active: true })
        .eq("id", existingMembership.id);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: targetUserId, company_id: callerCompanyId, role: normalizedRole, active: true });
      if (insErr) throw insErr;
    }

    // Also link the user's profile to this company
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, company_id")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (existingProfile && !existingProfile.company_id) {
      await supabaseAdmin
        .from("profiles")
        .update({ company_id: callerCompanyId })
        .eq("id", existingProfile.id);
    }

    return new Response(JSON.stringify({ ok: true, mode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Not allowed" ? 403 : 400;

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
