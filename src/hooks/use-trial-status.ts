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
}

const DEFAULT: TrialStatus = {
  loading: true,
  isTrialing: false,
  isExpired: false,
  hasActiveSubscription: true, // fail-open while loading so we don't lock users out
  daysRemaining: 0,
  trialEndsAt: null,
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
    const load = async () => {
      const { data, error } = await supabase.rpc("get_trial_status", { _user_id: user.id });
      if (cancelled) return;
      if (error || !data || data.length === 0) {
        setStatus({ ...DEFAULT, loading: false, hasActiveSubscription: true });
        return;
      }
      const row = data[0] as any;
      setStatus({
        loading: false,
        isTrialing: !!row.is_trialing,
        isExpired: !!row.is_expired,
        hasActiveSubscription: !!row.has_active_subscription,
        daysRemaining: Number(row.days_remaining ?? 0),
        trialEndsAt: row.trial_ends_at ?? null,
      });
    };

    load();
    // Refresh when window regains focus (e.g., user returns from Stripe checkout)
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [user?.id, profile?.company_id]);

  return status;
}
