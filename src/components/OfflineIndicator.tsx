import { useState, useEffect } from "react";
import { Wifi, WifiOff, Cloud, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getOfflineStatus, subscribeOfflineStatus, getPendingSalesCount, syncOfflineData } from "@/lib/offline-store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function OfflineIndicator() {
  const [status, setStatus] = useState<string>(getOfflineStatus());
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsub = subscribeOfflineStatus((s) => setStatus(s));

    const checkPending = () => {
      getPendingSalesCount().then(setPendingCount).catch(() => {});
    };
    checkPending();
    const interval = setInterval(checkPending, 5000);

    const handleSyncComplete = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const total = detail.salesSynced + detail.movementsSynced + detail.drawerEventsSynced;
      if (total > 0) {
        toast.success(`Synced ${total} offline transaction(s)`, { duration: 4000 });
      }
      checkPending();
    };
    window.addEventListener("offline-sync-complete", handleSyncComplete);

    return () => {
      unsub();
      clearInterval(interval);
      window.removeEventListener("offline-sync-complete", handleSyncComplete);
    };
  }, []);

  if (status === "online" && pendingCount === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {status === "offline" && (
        <Badge variant="destructive" className="gap-1.5 text-xs animate-pulse">
          <WifiOff className="h-3 w-3" /> Offline
          {pendingCount > 0 && <span>({pendingCount} pending)</span>}
        </Badge>
      )}
      {status === "syncing" && (
        <Badge variant="secondary" className="gap-1.5 text-xs">
          <Loader2 className="h-3 w-3 animate-spin" /> Syncing…
        </Badge>
      )}
      {status === "online" && pendingCount > 0 && (
        <Badge variant="secondary" className="gap-1.5 text-xs cursor-pointer" onClick={() => {
          syncOfflineData(supabase);
        }}>
          <Cloud className="h-3 w-3" /> {pendingCount} pending — tap to sync
        </Badge>
      )}
    </div>
  );
}
