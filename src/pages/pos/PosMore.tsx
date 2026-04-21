import { useAuth } from "@/contexts/AuthContext";
import { useAppMode } from "@/contexts/AppModeContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Wifi, WifiOff, Monitor, LogOut, Settings } from "lucide-react";
import { PrinterStatusIndicator } from "@/components/PrinterStatusIndicator";

export default function PosMore() {
  const { profile, signOut } = useAuth();
  const { setMode, isNativeShell } = useAppMode();

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-display font-bold text-foreground">More</h1>

      <div className="space-y-2">
        <Card>
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Printer className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Printer</span>
            </div>
            <PrinterStatusIndicator />
          </CardContent>
        </Card>

        {!isNativeShell && (
          <Card>
            <CardContent className="py-4">
              <Button variant="outline" className="w-full gap-2" onClick={() => setMode("full")}>
                <Monitor className="h-4 w-4" />
                Switch to Full Mode
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="py-4">
            <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
