import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AdminUser {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
  status: string;
  last_login_at: string | null;
}

interface AdminState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  adminUser: AdminUser | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  bootstrapNeeded: boolean;
  bootstrapError: string | null;
  login: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  logAction: (action: string, entity?: string, entityId?: string, metadata?: any) => Promise<void>;
}

const AdminAuthContext = createContext<AdminState>({
  user: null, session: null, loading: true, adminUser: null,
  isAdmin: false, isSuperAdmin: false, bootstrapNeeded: false, bootstrapError: null,
  login: async () => {}, signOut: async () => {}, logAction: async () => {},
});

export const useAdminAuth = () => useContext(AdminAuthContext);

const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [bootstrapNeeded, setBootstrapNeeded] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const fetchAdminUser = async (userId: string): Promise<AdminUser | null> => {
    try {
      const { data, error } = await supabase
        .from("admin_users")
        .select("id, email, role, full_name, status, last_login_at")
        .eq("user_id", userId)
        .eq("status", "active")
        .single();
      if (error || !data) return null;
      return data as unknown as AdminUser;
    } catch {
      return null;
    }
  };

  // Check bootstrap status
  const checkBootstrap = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-bootstrap");
      if (error) {
        console.error("Bootstrap check error:", error);
        return;
      }
      if (data?.needed) {
        setBootstrapNeeded(true);
        setBootstrapError(data.error || null);
      } else {
        setBootstrapNeeded(false);
        setBootstrapError(null);
      }
    } catch (e) {
      console.error("Bootstrap check failed:", e);
    }
  }, []);

  useEffect(() => {
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, sess) => {
        setSession(sess);
        setUser(sess?.user ?? null);
        if (sess?.user) {
          const admin = await fetchAdminUser(sess.user.id);
          setAdminUser(admin);
        } else {
          setAdminUser(null);
        }
        setLoading(false);
      }
    );

    // Get existing session
    supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        const admin = await fetchAdminUser(sess.user.id);
        setAdminUser(admin);
      }
      setLoading(false);
    });

    // Check bootstrap on mount
    checkBootstrap();

    return () => subscription.unsubscribe();
  }, [checkBootstrap]);

  // Session timeout (8 hours from last login)
  useEffect(() => {
    if (!adminUser?.last_login_at) return;
    const loginTime = new Date(adminUser.last_login_at).getTime();

    const check = () => {
      if (Date.now() - loginTime > SESSION_TIMEOUT_MS) {
        supabase.auth.signOut();
        setAdminUser(null);
        setUser(null);
        setSession(null);
      }
    };

    check(); // check immediately
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [adminUser?.last_login_at]);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.functions.invoke("admin-auth", {
      body: { email, password },
    });

    if (error) throw new Error(error.message || "Login failed");
    if (data?.error) throw new Error(data.error);

    // Set the session from the edge function response
    if (data?.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    if (data?.admin) {
      setAdminUser(data.admin);
    }

    return data;
  }, []);

  const signOut = useCallback(async () => {
    if (adminUser) {
      try {
        await supabase.from("admin_audit_logs").insert({
          admin_id: adminUser.id,
          admin_email: adminUser.email,
          action: "admin_logout",
        } as any);
      } catch {}
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setAdminUser(null);
  }, [adminUser]);

  const logAction = useCallback(async (action: string, entity?: string, entityId?: string, metadata?: any) => {
    if (!adminUser) return;
    try {
      await supabase.from("admin_audit_logs").insert({
        admin_id: adminUser.id,
        admin_email: adminUser.email,
        action,
        entity,
        entity_id: entityId,
        metadata,
      } as any);
    } catch (e) {
      console.error("Audit log failed:", e);
    }
  }, [adminUser]);

  return (
    <AdminAuthContext.Provider value={{
      user, session, loading, adminUser,
      isAdmin: !!adminUser,
      isSuperAdmin: adminUser?.role === "super_admin",
      bootstrapNeeded, bootstrapError,
      login, signOut, logAction,
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
