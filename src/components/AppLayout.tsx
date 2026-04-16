import { useState, useEffect } from "react";
import { useGlobalScanner } from "@/hooks/use-global-scanner";
import { AddProductFromScanDialog } from "@/components/AddProductFromScanDialog";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { TrialBanner } from "@/components/TrialBanner";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, company } = useAuth();
  const navigate = useNavigate();
  const { unknownBarcode, clearUnknownBarcode } = useGlobalScanner();
  const initials = company?.name?.split(" ").map((n) => n[0]).slice(0, 2).join("") || "S";
  const [alerts, setAlerts] = useState<any[]>([]);
  const unreadCount = alerts.filter((a) => !a.read).length;

  useEffect(() => {
    if (!profile?.company_id) return;
    supabase
      .from("alerts")
      .select("*")
      .eq("company_id", profile.company_id)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setAlerts(data || []));
  }, [profile?.company_id]);

  const markRead = async (id: string) => {
    await supabase.from("alerts").update({ read: true }).eq("id", id);
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));
  };

  const markAllRead = async () => {
    if (!profile?.company_id) return;
    const ids = alerts.filter((a) => !a.read).map((a) => a.id);
    if (ids.length === 0) return;
    await supabase.from("alerts").update({ read: true }).in("id", ids);
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TrialBanner />
          <header className="h-14 flex items-center border-b bg-card px-4 gap-3 shrink-0">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex-1" />
            <div className="flex items-center gap-2 ml-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="flex items-center justify-between p-3 border-b">
                    <h4 className="font-semibold text-sm">Notifications</h4>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-accent hover:underline">Mark all read</button>
                    )}
                  </div>
                  <ScrollArea className="max-h-80">
                    {alerts.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
                    ) : (
                      alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`p-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${!alert.read ? "bg-accent/5" : ""}`}
                          onClick={() => {
                            markRead(alert.id);
                            navigate(alert.type === "LOW_STOCK" ? "/alerts/low-stock" : "/alerts/price-changes");
                          }}
                        >
                          <p className="text-sm font-medium text-foreground">{alert.product_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                          <span className={`text-[10px] font-medium mt-1 inline-block ${alert.severity === "critical" ? "text-destructive" : "text-warning"}`}>
                            {alert.severity.toUpperCase()}
                          </span>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
              <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground">
                {initials}
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <div className="p-6 animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
      {unknownBarcode && (
        <AddProductFromScanDialog
          barcode={unknownBarcode}
          open={!!unknownBarcode}
          onClose={clearUnknownBarcode}
        />
      )}
    </SidebarProvider>
  );
}
