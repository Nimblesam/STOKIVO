import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AdminState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  adminUser: { id: string; email: string; role: string; active: boolean } | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
  logAction: (actionType: string, targetType?: string, targetId?: string, metadata?: any) => Promise<void>;
}

const AdminAuthContext = createContext<AdminState>({
  user: null, session: null, loading: true, adminUser: null, isAdmin: false, isSuperAdmin: false,
  signOut: async () => {}, logAction: async () => {},
});

export const useAdminAuth = () => useContext(AdminAuthContext);

const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminState["adminUser"]>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const fetchAdminUser = async (userId: string) => {
    const { data } = await supabase
      .from("admin_users")
      .select("id, email, role, active")
      .eq("user_id", userId)
      .eq("active", true)
      .single();
    setAdminUser(data as any);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchAdminUser(session.user.id), 0);
        } else {
          setAdminUser(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchAdminUser(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Session timeout
  useEffect(() => {
    const handleActivity = () => setLastActivity(Date.now());
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);

    const interval = setInterval(() => {
      if (adminUser && Date.now() - lastActivity > SESSION_TIMEOUT_MS) {
        supabase.auth.signOut();
        setAdminUser(null);
      }
    }, 30000);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      clearInterval(interval);
    };
  }, [adminUser, lastActivity]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setAdminUser(null);
  };

  const logAction = useCallback(async (actionType: string, targetType?: string, targetId?: string, metadata?: any) => {
    if (!adminUser) return;
    await supabase.from("admin_audit_logs").insert({
      admin_user_id: adminUser.id,
      admin_email: adminUser.email,
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      metadata,
    } as any);
  }, [adminUser]);

  const isAdmin = !!adminUser;
  const isSuperAdmin = adminUser?.role === "super_admin";

  return (
    <AdminAuthContext.Provider value={{ user, session, loading, adminUser, isAdmin, isSuperAdmin, signOut, logAction }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
