/**
 * JS bridge for the native Stripe Terminal (Tap to Pay) Capacitor plugin.
 *
 * Why this file exists:
 *  - The Stripe JS Terminal SDK (`js.stripe.com/terminal/v1/`) does NOT support
 *    Tap to Pay on Android. Tap to Pay requires the native Android Terminal SDK
 *    (`stripeterminal-localmobile`) which we wrap in a custom Capacitor plugin
 *    (`StripeTerminalPlugin.java`).
 *  - This module is the typed JS surface for that plugin. On non-native runtimes
 *    (the web app) every call returns `null` / `false` so callers can safely
 *    feature-detect with `isNativeTerminalAvailable()`.
 *
 * Wiring overview:
 *   use-terminal.ts → isNativeTerminalAvailable() ? native bridge : JS SDK
 *
 * Token + Connect routing remain server-side (`create-terminal-token` and
 * `create-terminal-payment`) — this bridge never touches secrets.
 */

import { supabase } from "@/integrations/supabase/client";

export interface NativeReader {
  serialNumber: string;
  label?: string | null;
  deviceType?: string | null;
  locationId?: string | null;
}

export interface NativeAvailability {
  available: boolean;
  tapToPaySupported: boolean;
  apiLevel?: number;
  hasNfc?: boolean;
}

function getCapacitor(): any | null {
  if (typeof window === "undefined") return null;
  const cap = (window as any).Capacitor;
  if (!cap) return null;
  if (typeof cap.isNativePlatform === "function" && !cap.isNativePlatform()) return null;
  return cap;
}

function getPlugin(): any | null {
  const cap = getCapacitor();
  if (!cap) return null;
  // Capacitor v3+ exposes plugins via Capacitor.Plugins.<Name>
  const plugin = cap.Plugins?.StripeTerminal;
  return plugin || null;
}

export function isNativeTerminalAvailable(): boolean {
  return getPlugin() !== null;
}

let initialized = false;
let connectionTokenListenerAttached = false;

async function attachConnectionTokenListener(plugin: any) {
  if (connectionTokenListenerAttached) return;
  connectionTokenListenerAttached = true;
  // The native plugin emits `connectionTokenRequested` whenever the SDK needs
  // a new token; we fetch one from our Supabase edge function and pass it back.
  plugin.addListener?.("connectionTokenRequested", async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-terminal-token");
      if (error || !data?.secret) {
        await plugin.provideConnectionToken({
          token: "",
          error: data?.error || error?.message || "Failed to fetch token",
        });
        return;
      }
      await plugin.provideConnectionToken({ token: data.secret });
    } catch (e: any) {
      try {
        await plugin.provideConnectionToken({ token: "", error: e?.message || "Token fetch error" });
      } catch { /* ignore */ }
    }
  });
}

export async function getNativeAvailability(): Promise<NativeAvailability> {
  const plugin = getPlugin();
  if (!plugin) return { available: false, tapToPaySupported: false };
  try {
    return await plugin.isAvailable();
  } catch {
    return { available: false, tapToPaySupported: false };
  }
}

export async function ensureNativeInitialized(): Promise<boolean> {
  const plugin = getPlugin();
  if (!plugin) return false;
  if (initialized) return true;
  await attachConnectionTokenListener(plugin);
  try {
    await plugin.initialize({});
    initialized = true;
    return true;
  } catch (e) {
    console.warn("[NativeTerminal] initialize failed", e);
    return false;
  }
}

export async function discoverTapToPayReaders(): Promise<NativeReader[]> {
  const plugin = getPlugin();
  if (!plugin) return [];
  if (!(await ensureNativeInitialized())) return [];
  try {
    const result = await plugin.discoverTapToPay();
    return Array.isArray(result?.readers) ? result.readers : [];
  } catch (e) {
    console.warn("[NativeTerminal] discoverTapToPay failed", e);
    return [];
  }
}

export async function connectTapToPayReader(args: {
  locationId: string;
  readerSerial?: string;
}): Promise<NativeReader | null> {
  const plugin = getPlugin();
  if (!plugin) return null;
  try {
    const result = await plugin.connectTapToPay(args);
    return result?.reader || null;
  } catch (e: any) {
    throw new Error(e?.message || "Failed to connect Tap to Pay reader");
  }
}

export async function disconnectNativeReader(): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) return;
  try { await plugin.disconnect(); } catch { /* ignore */ }
}

export async function collectAndProcessNative(clientSecret: string): Promise<{
  paymentIntentId: string;
  status?: string;
}> {
  const plugin = getPlugin();
  if (!plugin) throw new Error("Native Stripe Terminal not available");
  return await plugin.collectAndProcess({ clientSecret });
}

export async function cancelNativeCollect(): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) return;
  try { await plugin.cancelCollect(); } catch { /* ignore */ }
}
