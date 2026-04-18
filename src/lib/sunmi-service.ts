/**
 * SUNMI hardware bridge.
 * Talks to the native Capacitor SunmiPlugin (Android only).
 * Web/iOS gracefully no-op.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

export interface SunmiPluginShape {
  isAvailable(): Promise<{ isSunmi: boolean; printerReady: boolean }>;
  printReceipt(opts: { text: string; cut?: boolean }): Promise<{ success: boolean; reason?: string }>;
  openCashDrawer(): Promise<{ success: boolean; reason?: string }>;
  enableScanner(): Promise<{ success: boolean }>;
  addListener(
    event: "barcodeScanned",
    cb: (data: { barcode: string }) => void,
  ): Promise<PluginListenerHandle>;
}

const Sunmi = registerPlugin<SunmiPluginShape>("Sunmi");

let cached: { isSunmi: boolean; printerReady: boolean } | null = null;

export async function sunmiStatus() {
  if (Capacitor.getPlatform() !== "android") return { isSunmi: false, printerReady: false };
  if (cached) return cached;
  try {
    cached = await Sunmi.isAvailable();
    return cached;
  } catch {
    cached = { isSunmi: false, printerReady: false };
    return cached;
  }
}

export async function sunmiPrint(text: string, cut = true): Promise<boolean> {
  if (Capacitor.getPlatform() !== "android") return false;
  try {
    const r = await Sunmi.printReceipt({ text, cut });
    return r.success;
  } catch {
    return false;
  }
}

export async function sunmiOpenDrawer(): Promise<boolean> {
  if (Capacitor.getPlatform() !== "android") return false;
  try {
    const r = await Sunmi.openCashDrawer();
    return r.success;
  } catch {
    return false;
  }
}

/** Listen for hardware barcode scans. Returns an unsubscribe function. */
export function onSunmiBarcode(cb: (barcode: string) => void): () => void {
  if (Capacitor.getPlatform() !== "android") return () => {};
  let handle: PluginListenerHandle | null = null;
  Sunmi.addListener("barcodeScanned", (data) => cb(data.barcode))
    .then((h) => { handle = h; })
    .catch(() => {});
  return () => {
    if (handle) {
      try { handle.remove(); } catch {}
    }
  };
}
