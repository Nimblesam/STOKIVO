import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Store {
  id: string;
  company_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_default: boolean;
  status: string;
  currency: string;
}

interface StoreState {
  stores: Store[];
  activeStore: Store | null;
  activeStoreId: string | null;
  canSwitchStore: boolean;
  loading: boolean;
  switchStore: (storeId: string) => void;
  refreshStores: () => Promise<void>;
}

const StoreContext = createContext<StoreState>({
  stores: [],
  activeStore: null,
  activeStoreId: null,
  canSwitchStore: false,
  loading: true,
  switchStore: () => {},
  refreshStores: async () => {},
});

export const useStore = () => useContext(StoreContext);

const ACTIVE_STORE_KEY = "stokivo_active_store";

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [assignments, setAssignments] = useState<{ store_id: string; can_switch_store: boolean }[]>([]);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStoresAndAssignments = useCallback(async () => {
    if (!user || !profile?.company_id) {
      setStores([]);
      setAssignments([]);
      setActiveStoreId(null);
      setLoading(false);
      return;
    }

    const [storesRes, assignRes] = await Promise.all([
      supabase
        .from("stores")
        .select("id, company_id, name, address, phone, email, is_default, status, currency")
        .eq("company_id", profile.company_id)
        .eq("status", "active")
        .order("is_default", { ascending: false }),
      supabase
        .from("user_store_assignments")
        .select("store_id, can_switch_store")
        .eq("user_id", user.id)
        .eq("company_id", profile.company_id),
    ]);

    const storeList = (storesRes.data || []) as Store[];
    const assignList = assignRes.data || [];
    setStores(storeList);
    setAssignments(assignList);

    // Filter to only assigned stores
    const assignedIds = new Set(assignList.map((a) => a.store_id));
    const assignedStores = storeList.filter((s) => assignedIds.has(s.id));

    // Resolve active store
    const savedId = localStorage.getItem(ACTIVE_STORE_KEY);
    let resolvedId: string | null = null;

    if (savedId && assignedIds.has(savedId)) {
      resolvedId = savedId;
    } else if (assignedStores.length > 0) {
      // Pick default or first assigned
      const defaultStore = assignedStores.find((s) => s.is_default);
      resolvedId = defaultStore?.id || assignedStores[0].id;
    }

    setActiveStoreId(resolvedId);
    if (resolvedId) localStorage.setItem(ACTIVE_STORE_KEY, resolvedId);
    setLoading(false);
  }, [user, profile?.company_id]);

  useEffect(() => {
    fetchStoresAndAssignments();
  }, [fetchStoresAndAssignments]);

  const switchStore = useCallback((storeId: string) => {
    const assignedIds = new Set(assignments.map((a) => a.store_id));
    if (!assignedIds.has(storeId)) return;

    setActiveStoreId(storeId);
    localStorage.setItem(ACTIVE_STORE_KEY, storeId);
  }, [assignments]);

  const canSwitchStore = assignments.some((a) => a.can_switch_store) && assignments.length > 1;
  const activeStore = stores.find((s) => s.id === activeStoreId) || null;

  // Filter stores to only assigned ones for the switcher
  const assignedIds = new Set(assignments.map((a) => a.store_id));
  const assignedStores = stores.filter((s) => assignedIds.has(s.id));

  return (
    <StoreContext.Provider
      value={{
        stores: assignedStores,
        activeStore,
        activeStoreId,
        canSwitchStore,
        loading,
        switchStore,
        refreshStores: fetchStoresAndAssignments,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
