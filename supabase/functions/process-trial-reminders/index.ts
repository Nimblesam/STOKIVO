import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Cron-driven edge function that finds companies whose trial is ending soon
 * (or has just ended) and sends reminder emails. Idempotent via per-stage
 * boolean flags on subscriptions.
 *
 * Stages:
 *  - 7 days remaining → trial-reminder (daysRemaining=7)
 *  - 3 days remaining → trial-reminder (daysRemaining=3)
 *  - 1 day remaining  → trial-reminder (daysRemaining=1)
 *  - expired (trial_ends_at < now) → trial-reminder (expired=true)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const now = new Date();
  const horizon = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

  // Pull subscriptions with trials still active OR very recently expired
  const { data: subs, error } = await supabase
    .from("subscriptions")
    .select("company_id, trial_ends_at, trial_reminder_sent_7d, trial_reminder_sent_3d, trial_reminder_sent_1d, trial_expired_email_sent, stripe_subscription_status, expires_at")
    .not("trial_ends_at", "is", null)
    .lt("trial_ends_at", horizon.toISOString());

  if (error) {
    console.error("[trial-reminders] query failed", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  const sent: string[] = [];
  const skipped: string[] = [];

  for (const sub of subs || []) {
    // Skip if user already has an active paid subscription
    const hasActive =
      sub.stripe_subscription_status === "active" ||
      (sub.expires_at && new Date(sub.expires_at) > now);
    if (hasActive) {
      skipped.push(`${sub.company_id}:has_active_sub`);
      continue;
    }

    const trialEnd = new Date(sub.trial_ends_at);
    const msRemaining = trialEnd.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

    let stage: "7d" | "3d" | "1d" | "expired" | null = null;
    if (msRemaining < 0 && !sub.trial_expired_email_sent) stage = "expired";
    else if (daysRemaining <= 1 && msRemaining > 0 && !sub.trial_reminder_sent_1d) stage = "1d";
    else if (daysRemaining <= 3 && daysRemaining > 1 && !sub.trial_reminder_sent_3d) stage = "3d";
    else if (daysRemaining <= 7 && daysRemaining > 3 && !sub.trial_reminder_sent_7d) stage = "7d";

    if (!stage) {
      skipped.push(`${sub.company_id}:no_stage`);
      continue;
    }

    // Look up company + owner email
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", sub.company_id)
      .maybeSingle();

    const { data: ownerRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("company_id", sub.company_id)
      .eq("role", "owner")
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!ownerRole?.user_id) {
      skipped.push(`${sub.company_id}:no_owner`);
      continue;
    }

    const { data: emailRow } = await supabase.rpc("get_user_email", { _user_id: ownerRole.user_id });
    const recipientEmail = typeof emailRow === "string" ? emailRow : null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", ownerRole.user_id)
      .maybeSingle();

    if (!recipientEmail) {
      skipped.push(`${sub.company_id}:no_email`);
      continue;
    }

    // Send via shared transactional email function
    const trialEndDate = trialEnd.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const expired = stage === "expired";

    const { error: sendError } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "trial-reminder",
        recipientEmail,
        idempotencyKey: `trial-${stage}-${sub.company_id}`,
        templateData: {
          ownerName: profile?.full_name?.split(" ")[0],
          companyName: company?.name,
          daysRemaining: expired ? 0 : daysRemaining,
          trialEndDate,
          expired,
        },
      },
    });

    if (sendError) {
      console.error(`[trial-reminders] failed to send ${stage} for ${sub.company_id}`, sendError);
      skipped.push(`${sub.company_id}:send_error`);
      continue;
    }

    // Mark this stage as sent
    const updateField =
      stage === "7d" ? { trial_reminder_sent_7d: true } :
      stage === "3d" ? { trial_reminder_sent_3d: true } :
      stage === "1d" ? { trial_reminder_sent_1d: true } :
      { trial_expired_email_sent: true };

    await supabase.from("subscriptions").update(updateField).eq("company_id", sub.company_id);
    sent.push(`${sub.company_id}:${stage}`);
  }

  console.log("[trial-reminders] complete", { sentCount: sent.length, skippedCount: skipped.length });
  return new Response(JSON.stringify({ sent, skipped }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
