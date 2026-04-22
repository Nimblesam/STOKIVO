import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LowStockAlert {
  id: string;
  product_name: string;
  message: string;
  severity: string;
  created_at: string;
}

export function LowStockNotification() {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const hasPlayedRef = useRef(false);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (!profile?.company_id) return;
    const fetchAlerts = async () => {
      const { data } = await supabase
        .from("alerts")
        .select("id, product_name, message, severity, created_at")
        .eq("company_id", profile.company_id!)
        .eq("type", "LOW_STOCK")
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(10);
      const newAlerts = data || [];
      
      // Play sound if new alerts appeared
      if (newAlerts.length > prevCountRef.current && prevCountRef.current >= 0 && soundEnabled && !hasPlayedRef.current) {
        playAlertSound();
        hasPlayedRef.current = true;
        setTimeout(() => { hasPlayedRef.current = false; }, 30000);
      }
      prevCountRef.current = newAlerts.length;
      setAlerts(newAlerts);
      if (newAlerts.length > 0) setDismissed(false);
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [profile?.company_id, soundEnabled]);

  // Auto-dismiss the banner after 12s so it doesn't permanently take up screen space.
  // Reappears next poll if alerts still exist after the user navigates / refetches.
  useEffect(() => {
    if (alerts.length === 0 || dismissed) return;
    const t = setTimeout(() => setDismissed(true), 12000);
    return () => clearTimeout(t);
  }, [alerts, dismissed]);

  const playAlertSound = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
      // Second beep
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1100;
      osc2.type = "sine";
      gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.65);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.65);
    } catch {
      // Audio not available
    }
  };

  if (alerts.length === 0 || dismissed) return null;

  const criticalCount = alerts.filter(a => a.severity === "critical").length;

  return (
    <div className="stokivo-card border-l-4 border-l-destructive p-4 mb-6 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h4 className="font-display font-semibold text-sm text-foreground">
            Low Stock Alerts
          </h4>
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
            {alerts.length}
          </Badge>
          {criticalCount > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-destructive text-destructive">
              {criticalCount} critical
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute alerts" : "Enable sound"}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-muted-foreground" /> : <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDismissed(true)}>
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>
      <ScrollArea className={alerts.length > 3 ? "max-h-[160px]" : ""}>
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center gap-3 p-2 rounded-lg text-xs ${
                alert.severity === "critical"
                  ? "bg-destructive/5 border border-destructive/10"
                  : "bg-warning/5 border border-warning/10"
              }`}
            >
              <div className={`h-2 w-2 rounded-full shrink-0 ${
                alert.severity === "critical" ? "bg-destructive animate-pulse" : "bg-warning"
              }`} />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-foreground">{alert.product_name}</span>
                <span className="text-muted-foreground ml-1.5">{alert.message}</span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
