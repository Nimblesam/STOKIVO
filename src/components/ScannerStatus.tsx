import { useState, useEffect, useCallback } from "react";
import { Bluetooth, Usb, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type ScannerState = "connected" | "disconnected" | "detecting";

export function ScannerStatus() {
  const [state, setState] = useState<ScannerState>("detecting");
  const [lastScanTime, setLastScanTime] = useState<number | null>(null);
  const [deviceType, setDeviceType] = useState<"bluetooth" | "usb" | "unknown">("unknown");

  // Detect HID (keyboard-emulation) scanner input by monitoring rapid keystrokes
  const detectScanner = useCallback(() => {
    let buffer = "";
    let lastKeyTime = 0;
    const SCAN_SPEED_THRESHOLD = 50; // ms between keys – scanners are <50ms
    const MIN_LENGTH = 4;

    const handler = (e: KeyboardEvent) => {
      const now = Date.now();
      if (e.key === "Enter" && buffer.length >= MIN_LENGTH && (now - lastKeyTime) < SCAN_SPEED_THRESHOLD * 3) {
        // A complete barcode scan detected
        setState("connected");
        setLastScanTime(now);
        buffer = "";
        return;
      }

      if (e.key.length === 1) {
        if (now - lastKeyTime < SCAN_SPEED_THRESHOLD) {
          buffer += e.key;
        } else {
          buffer = e.key;
        }
        lastKeyTime = now;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Try Web Bluetooth API to detect Bluetooth scanners
  useEffect(() => {
    if ("bluetooth" in navigator) {
      setDeviceType("bluetooth");
    }

    // Check for USB HID devices via WebHID if available
    if ("hid" in navigator) {
      (navigator as any).hid.getDevices?.().then((devices: any[]) => {
        if (devices && devices.length > 0) {
          setState("connected");
          setDeviceType("usb");
        }
      }).catch(() => {});
    }

    const cleanup = detectScanner();

    // After 3 seconds of detection with no scan, show disconnected
    const timeout = setTimeout(() => {
      setState((prev) => prev === "detecting" ? "disconnected" : prev);
    }, 3000);

    return () => { cleanup(); clearTimeout(timeout); };
  }, [detectScanner]);

  // Reset to disconnected after 60s of inactivity
  useEffect(() => {
    if (!lastScanTime) return;
    const timer = setTimeout(() => setState("disconnected"), 60000);
    return () => clearTimeout(timer);
  }, [lastScanTime]);

  const Icon = deviceType === "bluetooth" ? Bluetooth : deviceType === "usb" ? Usb : Wifi;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 cursor-default">
          {state === "connected" ? (
            <Badge variant="outline" className="gap-1.5 text-xs border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline">Scanner</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </Badge>
          ) : state === "detecting" ? (
            <Badge variant="outline" className="gap-1.5 text-xs text-muted-foreground animate-pulse">
              <Wifi className="h-3 w-3" />
              <span className="hidden sm:inline">Detecting…</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 text-xs text-muted-foreground/60">
              <WifiOff className="h-3 w-3" />
              <span className="hidden sm:inline">No Scanner</span>
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">
          {state === "connected"
            ? `${deviceType === "bluetooth" ? "Bluetooth" : deviceType === "usb" ? "USB" : "Wireless"} scanner connected`
            : state === "detecting"
            ? "Searching for Bluetooth/USB scanner…"
            : "No scanner detected. Connect via Bluetooth or wireless USB."}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Scanners auto-connect as keyboard input devices
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
