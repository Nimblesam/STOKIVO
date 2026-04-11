import { useState, useEffect } from "react";
import { Printer, WifiOff, Bluetooth } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getPrinterState,
  subscribePrinter,
  connectPrinter,
  disconnectPrinter,
  isSerialSupported,
  isBluetoothSupported,
} from "@/lib/printer-service";

export function PrinterStatusIndicator() {
  const [printer, setPrinter] = useState(getPrinterState());

  useEffect(() => {
    const unsub = subscribePrinter(() => setPrinter(getPrinterState()));
    return () => { unsub(); };
  }, []);

  const hasSerial = isSerialSupported();
  const hasBluetooth = isBluetoothSupported();
  if (!hasSerial && !hasBluetooth) return null;

  return (
    <div className="flex items-center gap-2">
      {printer.status === "connected" ? (
        <Badge variant="secondary" className="gap-1.5 text-xs text-green-600 bg-green-50 dark:bg-green-950/30 cursor-pointer"
          onClick={disconnectPrinter}>
          <Printer className="h-3 w-3" />
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          {printer.printerName || "Printer"}
        </Badge>
      ) : printer.status === "connecting" ? (
        <Badge variant="secondary" className="gap-1.5 text-xs animate-pulse">
          <Printer className="h-3 w-3" /> Connecting…
        </Badge>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground">
              <Printer className="h-3 w-3" />
              <WifiOff className="h-2.5 w-2.5 text-destructive" />
              Connect Printer
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hasSerial && (
              <DropdownMenuItem onClick={() => connectPrinter("serial")}>
                <Printer className="h-3.5 w-3.5 mr-2" /> USB / Serial
              </DropdownMenuItem>
            )}
            {hasBluetooth && (
              <DropdownMenuItem onClick={() => connectPrinter("bluetooth")}>
                <Bluetooth className="h-3.5 w-3.5 mr-2" /> Bluetooth
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
