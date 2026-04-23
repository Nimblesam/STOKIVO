import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAppMode } from "@/contexts/AppModeContext";
import { useStore } from "@/contexts/StoreContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGlobalScanner } from "@/hooks/use-global-scanner";
import { useSunmiScanner } from "@/hooks/use-sunmi-scanner";
import { AddProductFromScanDialog } from "@/components/AddProductFromScanDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LowStockNotification } from "@/components/LowStockNotification";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ShoppingCart, RotateCcw, Receipt, LogOut, Monitor, Package, FileText, Printer } from "lucide-react";
import stokivoLogo from "@/assets/stokivo-logo.png";
import { PrinterStatusIndicator } from "@/components/PrinterStatusIndicator";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { cn } from "@/lib/utils";

interface PosLayoutProps {
  children: ReactNode;
}

const posNavItems = [
  { title: "Cashier", url: "/pos", icon: ShoppingCart },
  { title: "Products", url: "/pos/products", icon: Package },
  { title: "Invoices", url: "/pos/invoices", icon: FileText },
  { title: "Refunds", url: "/pos/refunds", icon: RotateCcw },
  { title: "Receipts", url: "/pos/receipts", icon: Receipt },
];

export function PosLayout({ children }: PosLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { setMode, isNativeShell } = useAppMode();
  const isMobile = useIsMobile();
  const { unknownBarcode, clearUnknownBarcode } = useGlobalScanner();

  // Bridge SUNMI hardware scanner -> Cashier's product lookup pipeline.
  const handleSunmiScan = useCallback((barcode: string) => {
    window.dispatchEvent(new CustomEvent("sunmi-barcode", { detail: { barcode } }));
  }, []);
  useSunmiScanner(handleSunmiScan);

  // Detect virtual keyboard via visualViewport — hide bottom nav so it doesn't float over the keyboard / inputs.
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const check = () => {
      // Heuristic: if visual viewport is at least 150px shorter than layout viewport, the keyboard is up.
      const diff = window.innerHeight - vv.height;
      setKeyboardOpen(diff > 150);
    };
    check();
    vv.addEventListener("resize", check);
    vv.addEventListener("scroll", check);
    return () => {
      vv.removeEventListener("resize", check);
      vv.removeEventListener("scroll", check);
    };
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2) || "?";

  // Desktop: Top bar navigation
  if (!isMobile) {
    return (
      <>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Top Bar */}
        <header className="h-14 border-b bg-card flex items-center px-4 gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <img src={stokivoLogo} alt="Stokivo" className="h-8 w-8 rounded-lg" />
            <span className="font-display font-bold text-base text-foreground">Stokivo POS</span>
          </div>

          <nav className="flex items-center gap-1 ml-6">
            {posNavItems.map((item) => (
              <Button
                key={item.url}
                variant={isActive(item.url) ? "default" : "ghost"}
                size="sm"
                onClick={() => navigate(item.url)}
                className={cn(
                  "gap-2",
                  isActive(item.url) && "shadow-sm"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Button>
            ))}
          </nav>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <OfflineIndicator />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {initials}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{profile?.full_name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {!isNativeShell && (
                  <>
                    <DropdownMenuItem onClick={() => setMode("full")} className="gap-2">
                      <Monitor className="h-4 w-4" />
                      Switch to Full Mode
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={signOut} className="gap-2 text-destructive">
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="px-4 pt-3">
            <LowStockNotification />
          </div>
          {children}
        </main>
      </div>
      {unknownBarcode && (
        <AddProductFromScanDialog
          barcode={unknownBarcode}
          open={!!unknownBarcode}
          onClose={clearUnknownBarcode}
        />
      )}
      </>
    );
  }

  // Mobile: Bottom tab navigation
  return (
    <>
    <div className="min-h-screen flex flex-col bg-background">
      {/* Mobile header */}
      <header className="h-12 border-b bg-card flex items-center px-3 shrink-0 gap-2">
        <img src={stokivoLogo} alt="Stokivo" className="h-7 w-7 rounded-lg" />
        <span className="font-display font-bold text-sm text-foreground">Stokivo</span>
        <div className="flex-1" />
        <OfflineIndicator />
        <PrinterStatusIndicator />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary">
                {initials}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground truncate">
              {profile?.full_name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {!isNativeShell && (
              <>
                <DropdownMenuItem onClick={() => setMode("full")} className="gap-2">
                  <Monitor className="h-4 w-4" />
                  Switch to Full Mode
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={signOut} className="gap-2 text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <div className="px-3 pt-2">
          <LowStockNotification />
        </div>
        {children}
      </main>

      {/* Bottom tabs (4 items, no More) — hidden when virtual keyboard is open */}
      <nav
        className={`fixed bottom-0 left-0 right-0 border-t bg-card flex items-center justify-around z-50 transition-transform duration-150 ${keyboardOpen ? "translate-y-full pointer-events-none" : ""}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)", height: "calc(4rem + env(safe-area-inset-bottom))" }}
      >
        {[
          { title: "Sell", url: "/pos", icon: ShoppingCart },
          { title: "Products", url: "/pos/products", icon: Package },
          { title: "Invoices", url: "/pos/invoices", icon: FileText },
          { title: "Orders", url: "/pos/receipts", icon: Receipt },
        ].map((item) => {
          const active = isActive(item.url);
          return (
            <button
              key={item.url}
              onClick={() => navigate(item.url)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors active:bg-muted/50",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "scale-110")} />
              <span className="text-[11px] font-medium">{item.title}</span>
            </button>
          );
        })}
      </nav>
    </div>
    {unknownBarcode && (
      <AddProductFromScanDialog
        barcode={unknownBarcode}
        open={!!unknownBarcode}
        onClose={clearUnknownBarcode}
      />
    )}
    </>
  );
}
