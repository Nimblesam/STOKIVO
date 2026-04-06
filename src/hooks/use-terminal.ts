import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TerminalStatus = "connected" | "connecting" | "offline" | "not_configured";

interface TerminalReader {
  id: string;
  label: string;
  status: string;
}

interface UseTerminalReturn {
  status: TerminalStatus;
  reader: TerminalReader | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  collectPayment: (amountMinor: number, currency: string) => Promise<{ success: boolean; error?: string; paymentIntentId?: string }>;
  cancelCollect: () => void;
  isCollecting: boolean;
}

export function useTerminal(): UseTerminalReturn {
  const [status, setStatus] = useState<TerminalStatus>("offline");
  const [reader, setReader] = useState<TerminalReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const terminalRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchConnectionToken = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("create-terminal-token");
    if (error || !data?.secret) {
      throw new Error(data?.error || "Failed to get terminal token");
    }
    return data.secret;
  }, []);

  const loadSDK = useCallback(async (): Promise<any> => {
    // Check if SDK is already loaded
    if ((window as any).StripeTerminal) {
      return (window as any).StripeTerminal;
    }

    // Load Stripe Terminal SDK dynamically
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
          setStatus("connecting");
          setReader(null);
          readerRef.current = null;
          scheduleReconnect();
        },
      });

      terminalRef.current = terminal;

      // Discover readers using simulated mode for development,
      // internet mode for production readers
      const config = { simulated: false };
      const discoverResult = await terminal.discoverReaders(config);

      if (discoverResult.error) {
        // Try simulated mode as fallback (for development/testing)
        const simResult = await terminal.discoverReaders({ simulated: true });
        if (simResult.error) {
          throw new Error(discoverResult.error.message || "No readers found");
        }
        if (simResult.discoveredReaders.length === 0) {
          throw new Error("No readers found. Ensure your terminal is powered on and connected to the internet.");
        }
        // Connect to first simulated reader
        const connectResult = await terminal.connectReader(simResult.discoveredReaders[0]);
        if (connectResult.error) {
          throw new Error(connectResult.error.message);
        }
        const r = connectResult.reader;
        readerRef.current = r;
        setReader({ id: r.id, label: r.label || "Simulated Reader", status: r.status });
        setStatus("connected");
        return;
      }

      if (discoverResult.discoveredReaders.length === 0) {
        throw new Error("No readers found. Ensure your terminal is powered on and connected.");
      }

      // Connect to the first available reader
      const connectResult = await terminal.connectReader(discoverResult.discoveredReaders[0]);
      if (connectResult.error) {
        throw new Error(connectResult.error.message);
      }

      const r = connectResult.reader;
      readerRef.current = r;
      setReader({ id: r.id, label: r.label || r.serial_number || "Card Reader", status: r.status });
      setStatus("connected");
    } catch (err: any) {
      console.error("[Terminal] Connection failed:", err);
      const msg = err?.message || "Connection failed";
      // If it's a config issue (no Terminal setup in Stripe), mark as not_configured
      if (msg.includes("not configured") || msg.includes("Terminal") && msg.includes("enable")) {
        setStatus("not_configured");
      } else {
        setStatus("offline");
      }
      setError(msg);
    }
  }, [fetchConnectionToken, loadSDK, scheduleReconnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    if (terminalRef.current && readerRef.current) {
      terminalRef.current.disconnectReader().catch(() => {});
    }
    terminalRef.current = null;
    readerRef.current = null;
    setReader(null);
    setStatus("offline");
  }, []);

  const collectPayment = useCallback(async (amountMinor: number, currency: string): Promise<{ success: boolean; error?: string; paymentIntentId?: string }> => {
    const terminal = terminalRef.current;
    if (!terminal || status !== "connected") {
      return { success: false, error: "Terminal not connected" };
    }

    setIsCollecting(true);
    try {
      // Create a PaymentIntent server-side, then collect on terminal
      const { data: piData, error: piError } = await supabase.functions.invoke("create-terminal-payment", {
        body: { amount: amountMinor, currency: currency.toLowerCase() },
      });

      if (piError || !piData?.client_secret) {
        throw new Error(piData?.error || "Failed to create payment intent");
      }

      // Collect payment method on the reader
      const collectResult = await terminal.collectPaymentMethod(piData.client_secret);
      if (collectResult.error) {
        throw new Error(collectResult.error.message);
      }

      // Process the payment
      const processResult = await terminal.processPayment(collectResult.paymentIntent);
      if (processResult.error) {
        throw new Error(processResult.error.message);
      }

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      disconnect();
    };
  }, []);

  return { status, reader, error, connect, disconnect, collectPayment, cancelCollect, isCollecting };
}
