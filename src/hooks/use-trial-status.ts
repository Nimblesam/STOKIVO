import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TrialStatus {
  loading: boolean;
  isTrialing: boolean;
  isExpired: boolean;
  hasActiveSubscription: boolean;
  daysRemaining: number;
  trialEndsAt: string | null;
  status: string | null; // active | trialing | past_due | canceled | etc.
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

const DEFAULT: TrialStatus = {
  loading: true,
  isTrialing: false,
  isExpired: false,
  hasActiveSubscription: true, // fail-open while loading so we don't lock users out
  daysRemaining: 0,
  trialEndsAt: null,
  status: null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
};

export function useTrialStatus(): TrialStatus {
  const { user, profile } = useAuth();
  const [status, setStatus] = useState<TrialStatus>(DEFAULT);

  useEffect(() => {
    if (!user?.id || !profile?.company_id) {
      setStatus({ ...DEFAULT, loading: false });
      return;
    }

    let cancelled = false;

    const loadFromDb = async () => {
      const [{ data: rpcData }, { data: subRow }] = await Promise.all([
        supabase.rpc("get_trial_status", { _user_id: user.id }),
        supabase
          .from("subscriptions")
          .select("stripe_subscription_status, cancel_at_period_end, current_period_end, trial_ends_at")
          .eq("company_id", profile.company_id!)
          .maybeSingle(),
      ]);
      if (cancelled) return;

      const row = (rpcData && rpcData[0]) as any;
      if (!row) {
        setStatus({ ...DEFAULT, loading: false });
        return;
      }

      setStatus({
        loading: false,
        isTrialing: !!row.is_trialing,
        isExpired: !!row.is_expired,
        hasActiveSubscription: !!row.has_active_subscription,
        daysRemaining: Number(row.days_remaining ?? 0),
        trialEndsAt: row.trial_ends_at ?? subRow?.trial_ends_at ?? null,
        status: subRow?.stripe_subscription_status ?? null,
        cancelAtPeriodEnd: !!subRow?.cancel_at_period_end,
        currentPeriodEnd: subRow?.current_period_end ?? null,
      });
    };

    const syncAndLoad = async () => {
      // Sync from Stripe → DB (Stripe is source of truth), then read fresh state
      try {
        await supabase.functions.invoke("check-subscription");
      } catch {
        // Non-fatal: still read whatever DB has
      }
      if (!cancelled) await loadFromDb();
    };

    syncAndLoad();
    const onFocus = () => syncAndLoad();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [user?.id, profile?.company_id]);

  return status;
}
