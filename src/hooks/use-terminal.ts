import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TerminalStatus = "connected" | "connecting" | "offline" | "not_configured";

interface TerminalReader {
  id: string;
  label: string;
  status: string;
  type?: "internet" | "bluetooth" | "tap_to_pay";
}

interface UseTerminalReturn {
  status: TerminalStatus;
  reader: TerminalReader | null;
  availableReaders: TerminalReader[];
  error: string | null;
  tapToPaySupported: boolean;
  connect: () => Promise<void>;
  connectToReader: (readerId: string) => Promise<void>;
  disconnect: () => void;
  collectPayment: (amountMinor: number, currency: string) => Promise<{ success: boolean; error?: string; paymentIntentId?: string }>;
  cancelCollect: () => void;
  isCollecting: boolean;
}

// Heuristic: Tap to Pay (Stripe Terminal JS) works on supported mobile devices.
// The web SDK doesn't directly do Tap to Pay on iOS/Android (that's the native SDK),
// but we expose the flag so the UI can show "Tap to Pay" when running inside a
// Capacitor/native shell where the device acts as the reader.
function detectTapToPay(): boolean {
  if (typeof window === "undefined") return false;
  // Capacitor native runtime (Android Tap to Pay capable phones)
  const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();
  if (isCapacitor) return true;
  return false;
}

export function useTerminal(): UseTerminalReturn {
  const [status, setStatus] = useState<TerminalStatus>("offline");
  const [reader, setReader] = useState<TerminalReader | null>(null);
  const [availableReaders, setAvailableReaders] = useState<TerminalReader[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [tapToPaySupported] = useState<boolean>(detectTapToPay());
  const terminalRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAttemptedAutoConnect = useRef(false);

  const fetchConnectionToken = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("create-terminal-token");
    if (error || !data?.secret) {
      throw new Error(data?.error || "Failed to get terminal token");
    }
    return data.secret;
  }, []);

  const loadSDK = useCallback(async (): Promise<any> => {
    if ((window as any).StripeTerminal) {
      return (window as any).StripeTerminal;
    }
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

  const connectReaderById = useCallback(async (terminal: any, discovered: any[], targetId?: string) => {
    const target = targetId
      ? discovered.find((r) => r.id === targetId) || discovered[0]
      : discovered[0];
    const connectResult = await terminal.connectReader(target);
    if (connectResult.error) throw new Error(connectResult.error.message);
    const r = connectResult.reader;
    readerRef.current = r;
    setReader({
      id: r.id,
      label: r.label || r.serial_number || "Card Reader",
      status: r.status,
      type: "internet",
    });
    setStatus("connected");
  }, []);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);

    try {
      const StripeTerminal = await loadSDK();

      const terminal = StripeTerminal.create({
        onFetchConnectionToken: fetchConnectionToken,
        onUnexpectedReaderDisconnect: () => {
          console.warn("[Terminal] Reader disconnected unexpectedly");
          setStatus("offline");
          setReader(null);
          readerRef.current = null;
          // Soft reconnect attempt — UI stays usable via Manual fallback meanwhile.
          scheduleReconnect(8000);
        },
      });

      terminalRef.current = terminal;

      // Try real (internet) readers first
      const discoverResult = await terminal.discoverReaders({ simulated: false });
      let discovered = !discoverResult.error ? discoverResult.discoveredReaders || [] : [];

      if (discovered.length === 0) {
        // No live readers — silently mark offline so UI falls back to Manual.
        // Do NOT throw: avoids the "broken" red state. Manual card always works.
        setAvailableReaders([]);
        setStatus("offline");
        setError(null);
        return;
      }

      setAvailableReaders(
        discovered.map((r: any) => ({
          id: r.id,
          label: r.label || r.serial_number || "Card Reader",
          status: r.status,
          type: "internet" as const,
        })),
      );

      await connectReaderById(terminal, discovered);
    } catch (err: any) {
      console.warn("[Terminal] Connection failed (graceful):", err?.message);
      const msg = err?.message || "Connection failed";
      // Treat all failures as offline — UI degrades to Manual Card automatically.
      // Only mark as not_configured for very explicit Stripe config errors.
      if (msg.toLowerCase().includes("not configured") || msg.toLowerCase().includes("stripe terminal is not enabled")) {
        setStatus("not_configured");
      } else {
        setStatus("offline");
      }
      setError(msg);
      setAvailableReaders([]);
    }
  }, [fetchConnectionToken, loadSDK, scheduleReconnect, connectReaderById]);

  const connectToReader = useCallback(async (readerId: string) => {
    if (!terminalRef.current) {
      await connect();
      return;
    }
    setStatus("connecting");
    try {
      const discoverResult = await terminalRef.current.discoverReaders({ simulated: false });
      if (discoverResult.error) throw new Error(discoverResult.error.message);
      await connectReaderById(terminalRef.current, discoverResult.discoveredReaders || [], readerId);
    } catch (err: any) {
      setStatus("offline");
      setError(err?.message || "Failed to connect to reader");
    }
  }, [connect, connectReaderById]);

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

  const collectPayment = useCallback(async (amountMinor: number, currency: string): Promise<{ success: boolean; error?: string; paymentIntentId?: string }> => {
    const terminal = terminalRef.current;
    if (!terminal || status !== "connected") {
      return { success: false, error: "No card reader connected. Use Manual Card instead." };
    }

    setIsCollecting(true);
    try {
      const { data: piData, error: piError } = await supabase.functions.invoke("create-terminal-payment", {
        body: { amount: amountMinor, currency: currency.toLowerCase() },
      });

      if (piError || !piData?.client_secret) {
        throw new Error(piData?.error || "Failed to create payment intent");
      }

      const collectResult = await terminal.collectPaymentMethod(piData.client_secret);
      if (collectResult.error) throw new Error(collectResult.error.message);

      const processResult = await terminal.processPayment(collectResult.paymentIntent);
      if (processResult.error) throw new Error(processResult.error.message);

      return {
        success: true,
        paymentIntentId: processResult.paymentIntent.id,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || "Payment failed" };
    } finally {
      setIsCollecting(false);
    }
  }, [status]);

  const cancelCollect = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.cancelCollectPaymentMethod().catch(() => {});
    }
    setIsCollecting(false);
  }, []);

  // Auto-discover readers once on mount so UI can decide what to show.
  // Failures are silent — Manual Card is always available as fallback.
  useEffect(() => {
    if (hasAttemptedAutoConnect.current) return;
    hasAttemptedAutoConnect.current = true;
    connect().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    reader,
    availableReaders,
    error,
    tapToPaySupported,
    connect,
    connectToReader,
    disconnect,
    collectPayment,
    cancelCollect,
    isCollecting,
  };
}
