import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  isNativeTerminalAvailable,
  getNativeAvailability,
  ensureNativeInitialized,
  discoverTapToPayReaders,
  connectTapToPayReader,
  collectAndProcessNative,
  cancelNativeCollect,
} from "@/lib/native-stripe-terminal";

export type TerminalStatus = "connected" | "connecting" | "offline" | "not_configured";

export type TerminalErrorKind =
  | "reader_disconnected"
  | "network"
  | "cancelled"
  | "card_declined"
  | "unknown";

export interface TerminalReader {
  id: string;
  label: string;
  status: string;
  type?: "internet" | "bluetooth" | "tap_to_pay";
  serial_number?: string;
}

export interface CollectResult {
  success: boolean;
  error?: string;
  errorKind?: TerminalErrorKind;
  paymentIntentId?: string;
  recoverable?: boolean;
}

interface UseTerminalReturn {
  status: TerminalStatus;
  reader: TerminalReader | null;
  availableReaders: TerminalReader[];
  error: string | null;
  tapToPaySupported: boolean;
  hasReaderAvailable: boolean;
  connect: () => Promise<void>;
  connectToReader: (readerId: string) => Promise<void>;
  rediscoverReaders: () => Promise<TerminalReader[]>;
  disconnect: () => void;
  collectPayment: (amountMinor: number, currency: string) => Promise<CollectResult>;
  collectTapToPay: (amountMinor: number, currency: string) => Promise<CollectResult>;
  retryLastPayment: () => Promise<CollectResult>;
  cancelCollect: () => void;
  isCollecting: boolean;
}

const LAST_READER_KEY = "stokivo_last_reader_id";
const LAST_LOCATION_KEY = "stokivo_terminal_location_id";

function classifyError(err: any): TerminalErrorKind {
  const msg = String(err?.message || err?.code || err || "").toLowerCase();
  const code = String(err?.code || "").toLowerCase();
  if (
    code.includes("reader") ||
    msg.includes("reader") ||
    msg.includes("disconnect") ||
    msg.includes("not connected") ||
    msg.includes("offline")
  ) return "reader_disconnected";
  if (msg.includes("network") || msg.includes("timeout") || msg.includes("fetch") || msg.includes("connection")) return "network";
  if (msg.includes("cancel")) return "cancelled";
  if (msg.includes("declin") || msg.includes("insufficient") || code.includes("declined")) return "card_declined";
  return "unknown";
}

/**
 * Resolve a Stripe Terminal `location` (tml_xxx) for Tap to Pay on this
 * merchant's connected account. Tap to Pay REQUIRES a location. We cache the
 * first one we find in localStorage. If none exists, the merchant must create
 * one in Settings → Locations (powered by the `terminal-locations` function).
 */
async function resolveTerminalLocationId(): Promise<string | null> {
  try {
    const cached = localStorage.getItem(LAST_LOCATION_KEY);
    if (cached) return cached;
  } catch { /* ignore */ }
  try {
    const { data, error } = await supabase.functions.invoke("terminal-locations");
    if (error || !data?.locations?.length) return null;
    const id = data.locations[0].id as string;
    try { localStorage.setItem(LAST_LOCATION_KEY, id); } catch { /* ignore */ }
    return id;
  } catch {
    return null;
  }
}

export function useTerminal(): UseTerminalReturn {
  const [status, setStatus] = useState<TerminalStatus>("offline");
  const [reader, setReader] = useState<TerminalReader | null>(null);
  const [availableReaders, setAvailableReaders] = useState<TerminalReader[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [tapToPaySupported, setTapToPaySupported] = useState<boolean>(false);

  // Ask the native plugin whether Tap to Pay is actually supported on this device.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isNativeTerminalAvailable()) {
        if (!cancelled) setTapToPaySupported(false);
        return;
      }
      const a = await getNativeAvailability();
      if (!cancelled) setTapToPaySupported(!!a.tapToPaySupported);
    })();
    return () => { cancelled = true; };
  }, []);

  const terminalRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAttemptedAutoConnect = useRef(false);

  // Last payment context for retry without recreating the PaymentIntent.
  const lastPaymentRef = useRef<{ clientSecret: string; piId: string; amountMinor: number; currency: string } | null>(null);

  const fetchConnectionToken = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("create-terminal-token");
    if (error || !data?.secret) {
      throw new Error(data?.error || "Failed to get terminal token");
    }
    return data.secret;
  }, []);

  const loadSDK = useCallback(async (): Promise<any> => {
    if ((window as any).StripeTerminal) return (window as any).StripeTerminal;
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src*="stripe-terminal"]');
      if (existing) {
        existing.addEventListener("load", () => resolve((window as any).StripeTerminal));
        return;
      }
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/terminal/v1/";
      script.async = true;
      script.onload = () => resolve((window as any).StripeTerminal);
      script.onerror = () => reject(new Error("Failed to load Stripe Terminal SDK"));
      document.head.appendChild(script);
    });
  }, []);

  const scheduleReconnect = useCallback((delayMs = 5000) => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    reconnectTimer.current = setTimeout(() => {
      console.log("[Terminal] Attempting reconnection...");
      connect();
    }, delayMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mapReader = (r: any): TerminalReader => ({
    id: r.id,
    label: r.label || r.serial_number || "Card Reader",
    status: r.status,
    serial_number: r.serial_number,
    type: "internet",
  });

  const connectReaderById = useCallback(async (terminal: any, discovered: any[], targetId?: string) => {
    let target: any | undefined;
    if (targetId) {
      target = discovered.find((r) => r.id === targetId);
    }
    if (!target) {
      // Prefer last used reader if remembered
      const lastId = typeof window !== "undefined" ? localStorage.getItem(LAST_READER_KEY) : null;
      if (lastId) target = discovered.find((r) => r.id === lastId);
    }
    if (!target) target = discovered[0];

    const connectResult = await terminal.connectReader(target);
    if (connectResult.error) throw new Error(connectResult.error.message);
    const r = connectResult.reader;
    readerRef.current = r;
    const mapped = mapReader(r);
    setReader(mapped);
    setStatus("connected");
    try { localStorage.setItem(LAST_READER_KEY, r.id); } catch { /* ignore */ }
  }, []);

  const ensureTerminal = useCallback(async () => {
    if (terminalRef.current) return terminalRef.current;
    const StripeTerminal = await loadSDK();
    const terminal = StripeTerminal.create({
      onFetchConnectionToken: fetchConnectionToken,
      onUnexpectedReaderDisconnect: () => {
        console.warn("[Terminal] Reader disconnected unexpectedly");
        setStatus("offline");
        setReader(null);
        readerRef.current = null;
        scheduleReconnect(8000);
      },
    });
    terminalRef.current = terminal;
    return terminal;
  }, [fetchConnectionToken, loadSDK, scheduleReconnect]);

  const rediscoverReaders = useCallback(async (): Promise<TerminalReader[]> => {
    try {
      const terminal = await ensureTerminal();
      const discoverResult = await terminal.discoverReaders({ simulated: false });
      const discovered = !discoverResult.error ? discoverResult.discoveredReaders || [] : [];
      const mapped = discovered.map(mapReader);
      setAvailableReaders(mapped);
      return mapped;
    } catch (err) {
      console.warn("[Terminal] Rediscover failed:", err);
      setAvailableReaders([]);
      return [];
    }
  }, [ensureTerminal]);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    try {
      const terminal = await ensureTerminal();
      const discoverResult = await terminal.discoverReaders({ simulated: false });
      const discovered = !discoverResult.error ? discoverResult.discoveredReaders || [] : [];

      if (discovered.length === 0) {
        setAvailableReaders([]);
        setStatus("offline");
        setError(null);
        return;
      }

      setAvailableReaders(discovered.map(mapReader));

      // Smart auto-connect rules:
      // - 1 reader → silent connect
      // - multiple readers → try last-used; otherwise leave for UI to pick
      if (discovered.length === 1) {
        await connectReaderById(terminal, discovered);
      } else {
        const lastId = localStorage.getItem(LAST_READER_KEY);
        if (lastId && discovered.some((r: any) => r.id === lastId)) {
          await connectReaderById(terminal, discovered, lastId);
        } else {
          setStatus("offline"); // wait for user to pick
        }
      }
    } catch (err: any) {
      console.warn("[Terminal] Connection failed (graceful):", err?.message);
      const msg = err?.message || "Connection failed";
      if (msg.toLowerCase().includes("not configured") || msg.toLowerCase().includes("stripe terminal is not enabled")) {
        setStatus("not_configured");
      } else {
        setStatus("offline");
      }
      setError(msg);
      setAvailableReaders([]);
    }
  }, [ensureTerminal, connectReaderById]);

  const connectToReader = useCallback(async (readerId: string) => {
    setStatus("connecting");
    try {
      const terminal = await ensureTerminal();
      const discoverResult = await terminal.discoverReaders({ simulated: false });
      if (discoverResult.error) throw new Error(discoverResult.error.message);
      const discovered = discoverResult.discoveredReaders || [];
      setAvailableReaders(discovered.map(mapReader));
      await connectReaderById(terminal, discovered, readerId);
    } catch (err: any) {
      setStatus("offline");
      setError(err?.message || "Failed to connect to reader");
    }
  }, [ensureTerminal, connectReaderById]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    if (terminalRef.current && readerRef.current) {
      terminalRef.current.disconnectReader().catch(() => {});
    }
    terminalRef.current = null;
    readerRef.current = null;
    setReader(null);
    setStatus("offline");
    setAvailableReaders([]);
  }, []);

  // Internal: run collect + process for a given client_secret on the connected terminal.
  const runIntent = useCallback(async (clientSecret: string, piId: string): Promise<CollectResult> => {
    const terminal = terminalRef.current;
    if (!terminal || status !== "connected") {
      return {
        success: false,
        error: "No card reader connected.",
        errorKind: "reader_disconnected",
        recoverable: true,
      };
    }
    try {
      const collectResult = await terminal.collectPaymentMethod(clientSecret);
      if (collectResult.error) {
        const kind = classifyError(collectResult.error);
        return {
          success: false,
          error: collectResult.error.message,
          errorKind: kind,
          recoverable: kind === "reader_disconnected" || kind === "network",
        };
      }
      const processResult = await terminal.processPayment(collectResult.paymentIntent);
      if (processResult.error) {
        const kind = classifyError(processResult.error);
        return {
          success: false,
          error: processResult.error.message,
          errorKind: kind,
          recoverable: kind === "reader_disconnected" || kind === "network",
        };
      }
      // Success — clear retry context
      lastPaymentRef.current = null;
      return { success: true, paymentIntentId: processResult.paymentIntent.id };
    } catch (err: any) {
      const kind = classifyError(err);
      return {
        success: false,
        error: err?.message || "Payment failed",
        errorKind: kind,
        recoverable: kind === "reader_disconnected" || kind === "network",
      };
    }
  }, [status]);

  const collectPayment = useCallback(async (amountMinor: number, currency: string): Promise<CollectResult> => {
    setIsCollecting(true);
    try {
      // Create a fresh PaymentIntent for this charge
      const { data: piData, error: piError } = await supabase.functions.invoke("create-terminal-payment", {
        body: { amount: amountMinor, currency: currency.toLowerCase() },
      });
      if (piError || !piData?.client_secret) {
        return {
          success: false,
          error: piData?.error || "Failed to create payment intent",
          errorKind: "network",
          recoverable: false,
        };
      }
      lastPaymentRef.current = {
        clientSecret: piData.client_secret,
        piId: piData.payment_intent_id || "",
        amountMinor,
        currency,
      };
      return await runIntent(piData.client_secret, piData.payment_intent_id || "");
    } finally {
      setIsCollecting(false);
    }
  }, [runIntent]);

  // Retry the SAME PaymentIntent (no recreate) – used after reader recovery.
  const retryLastPayment = useCallback(async (): Promise<CollectResult> => {
    const last = lastPaymentRef.current;
    if (!last) {
      return { success: false, error: "Nothing to retry", errorKind: "unknown", recoverable: false };
    }
    setIsCollecting(true);
    try {
      return await runIntent(last.clientSecret, last.piId);
    } finally {
      setIsCollecting(false);
    }
  }, [runIntent]);

  const cancelCollect = useCallback(() => {
    if (isNativeTerminalAvailable()) {
      cancelNativeCollect().catch(() => {});
    }
    if (terminalRef.current) {
      terminalRef.current.cancelCollectPaymentMethod().catch(() => {});
    }
    setIsCollecting(false);
  }, []);

  /**
   * Tap to Pay on Android — routed through the native Capacitor plugin.
   * The web has no Tap to Pay support, so this short-circuits with a clear error.
   */
  const collectTapToPay = useCallback(async (amountMinor: number, currency: string): Promise<CollectResult> => {
    if (!isNativeTerminalAvailable()) {
      return {
        success: false,
        error: "Tap to Pay is only available in the Stokivo Android app.",
        errorKind: "unknown",
        recoverable: false,
      };
    }
    setIsCollecting(true);
    try {
      const ok = await ensureNativeInitialized();
      if (!ok) {
        return { success: false, error: "Failed to initialize Tap to Pay.", errorKind: "unknown", recoverable: false };
      }
      const locationId = await resolveTerminalLocationId();
      if (!locationId) {
        return {
          success: false,
          error: "No Stripe Terminal location set up. Add one in Settings → Payments.",
          errorKind: "unknown",
          recoverable: false,
        };
      }
      const readers = await discoverTapToPayReaders();
      if (readers.length === 0) {
        return { success: false, error: "Tap to Pay not available on this device.", errorKind: "reader_disconnected", recoverable: false };
      }
      try {
        await connectTapToPayReader({ locationId, readerSerial: readers[0].serialNumber });
      } catch (e: any) {
        return { success: false, error: e?.message || "Failed to start Tap to Pay.", errorKind: "reader_disconnected", recoverable: true };
      }
      // Create PI on connected account (server-side handles routing).
      const { data: piData, error: piError } = await supabase.functions.invoke("create-terminal-payment", {
        body: { amount: amountMinor, currency: currency.toLowerCase() },
      });
      if (piError || !piData?.client_secret) {
        return { success: false, error: piData?.error || "Failed to create payment intent", errorKind: "network", recoverable: false };
      }
      lastPaymentRef.current = {
        clientSecret: piData.client_secret,
        piId: piData.payment_intent_id || "",
        amountMinor,
        currency,
      };
      try {
        const result = await collectAndProcessNative(piData.client_secret);
        lastPaymentRef.current = null;
        return { success: true, paymentIntentId: result.paymentIntentId };
      } catch (e: any) {
        const kind = classifyError(e);
        return { success: false, error: e?.message || "Tap to Pay failed", errorKind: kind, recoverable: kind === "reader_disconnected" || kind === "network" };
      }
    } finally {
      setIsCollecting(false);
    }
  }, []);

  // Auto-discover once on mount
  useEffect(() => {
    if (hasAttemptedAutoConnect.current) return;
    hasAttemptedAutoConnect.current = true;
    connect().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Background re-discovery: while we're offline (no reader connected), poll
  // every 15s for newly powered-on Wi-Fi or Bluetooth readers and silently
  // auto-connect to them. This makes "plug in your reader" Just Work — the
  // merchant doesn't have to tap anything in the UI.
  useEffect(() => {
    if (status === "connected" || status === "connecting" || status === "not_configured") return;
    const interval = setInterval(() => {
      // Only attempt while the page is visible to avoid wasted Stripe API calls.
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      connect().catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasReaderAvailable = availableReaders.length > 0 || status === "connected" || tapToPaySupported;

  return {
    status,
    reader,
    availableReaders,
    error,
    tapToPaySupported,
    hasReaderAvailable,
    connect,
    connectToReader,
    rediscoverReaders,
    disconnect,
    collectPayment,
    collectTapToPay,
    retryLastPayment,
    cancelCollect,
    isCollecting,
  };
}
