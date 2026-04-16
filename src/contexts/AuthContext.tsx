import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profileLoading: boolean;
  authResolved: boolean;
  profile: { id: string; full_name: string; avatar_url: string | null; company_id: string | null } | null;
  company: { id: string; name: string; currency: string; brand_color: string; plan: string; status: string; stripe_account_id: string | null; country: string; business_type: string; logo_url: string | null } | null;
  role: string | null;
  mfaRequired: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null, session: null, loading: true, profileLoading: false, profile: null, company: null, role: null,
  authResolved: false, mfaRequired: false, signOut: async () => {}, refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const [profile, setProfile] = useState<AuthState["profile"]>(null);
  const [company, setCompany] = useState<AuthState["company"]>(null);
  const [role, setRole] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);

  const checkMfaStatus = async () => {
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factors?.totp?.filter(f => f.status === "verified") || [];
      if (verifiedFactors.length > 0) {
        // User has MFA enrolled — check current assurance level
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal && aal.currentLevel === "aal1" && aal.nextLevel === "aal2") {
          setMfaRequired(true);
          return true; // MFA not yet verified
        }
      }
      setMfaRequired(false);
      return false;
    } catch {
      setMfaRequired(false);
      return false;
    }
  };

  const fetchProfile = async (userId: string) => {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, company_id")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, company_id, created_at")
      .eq("user_id", userId)
      .eq("active", true)
      .order("created_at", { ascending: true });

    const primaryRole = roles?.[0] ?? null;
    const effectiveCompanyId = prof?.company_id ?? primaryRole?.company_id ?? null;

    setProfile(
      prof
        ? {
            ...prof,
            company_id: effectiveCompanyId,
          }
        : null
    );

    setRole(primaryRole?.role || null);

    if (effectiveCompanyId) {
      const { data: comp } = await supabase
        .from("companies")
        .select("id, name, currency, brand_color, plan, status, stripe_account_id, country, business_type, logo_url")
        .eq("id", effectiveCompanyId)
        .maybeSingle();
      setCompany(comp);
    } else {
      setCompany(null);
    }

    if (prof && !prof.company_id && effectiveCompanyId) {
      void supabase
        .from("profiles")
        .update({ company_id: effectiveCompanyId })
        .eq("id", prof.id);
    }

    setAuthResolved(true);
  };

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 8000);

    // 1. Set up listener FIRST (fire-and-forget — no awaits to avoid deadlocks)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fire-and-forget profile hydration for sign-in / token refresh events
          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "MFA_CHALLENGE_VERIFIED") {
            setProfileLoading(true);
            checkMfaStatus().then((needsMfa) => {
              if (!needsMfa) {
                fetchProfile(session.user.id).finally(() => setProfileLoading(false));
              } else {
                setProfileLoading(false);
              }
            }).catch(() => setProfileLoading(false));
          }
        } else {
          setProfile(null);
          setCompany(null);
          setRole(null);
          setMfaRequired(false);
          setAuthResolved(true);
        }
      }
    );

    // 2. Restore session from storage — this is the ONLY place we await profile fetch
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
          const needsMfa = await checkMfaStatus();
          if (!needsMfa) {
            await fetchProfile(session.user.id);
          } else {
            setAuthResolved(true);
          }
        } catch {
          // Continue even if profile fetch fails
          setAuthResolved(true);
        }
      } else {
        setAuthResolved(true);
      }
      setLoading(false);
      clearTimeout(timeout);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setCompany(null);
    setRole(null);
    setMfaRequired(false);
    setAuthResolved(true);
  };

  const refreshProfile = async () => {
    if (user) {
      await checkMfaStatus();
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profileLoading, authResolved, profile, company, role, mfaRequired, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
