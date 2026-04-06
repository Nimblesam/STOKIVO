import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: { id: string; full_name: string; avatar_url: string | null; company_id: string | null } | null;
  company: { id: string; name: string; currency: string; brand_color: string; plan: string; status: string } | null;
  role: string | null;
  mfaRequired: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null, session: null, loading: true, profile: null, company: null, role: null,
  mfaRequired: false, signOut: async () => {}, refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
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
      .single();
    setProfile(prof);

    if (prof?.company_id) {
      const { data: comp } = await supabase
        .from("companies")
        .select("id, name, currency, brand_color, plan, status")
        .eq("id", prof.company_id)
        .single();
      setCompany(comp);

      const { data: ur } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("company_id", prof.company_id)
        .single();
      setRole(ur?.role || null);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const needsMfa = await checkMfaStatus();
          if (!needsMfa) {
            setTimeout(() => fetchProfile(session.user.id), 0);
          }
        } else {
          setProfile(null);
          setCompany(null);
          setRole(null);
          setMfaRequired(false);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const needsMfa = await checkMfaStatus();
        if (!needsMfa) {
          fetchProfile(session.user.id);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setCompany(null);
    setRole(null);
    setMfaRequired(false);
  };

  const refreshProfile = async () => {
    if (user) {
      await checkMfaStatus();
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, company, role, mfaRequired, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
