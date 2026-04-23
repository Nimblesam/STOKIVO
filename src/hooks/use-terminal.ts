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
  status: string;                 // "online" | "offline"
  type?: "internet" | "bluetooth" | "tap_to_pay";
  serial_number?: string;
  device_type?: string;
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

  const hasAttemptedAutoConnect = useRef(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPaymentRef = useRef<{ readerId: string; piId: string; amountMinor: number; currency: string } | null>(null);
  const cancelRef = useRef<{ piId: string; readerId: string } | null>(null);

  const mapReader = (r: any): TerminalReader => ({
    id: r.id,
    label: r.label || r.serial_number || "Card Reader",
    status: r.status || "offline",
    type: "internet",
    serial_number: r.serial_number,
    device_type: r.device_type,
  });

  const listInternetReaders = useCallback(async (): Promise<TerminalReader[]> => {
    const { data, error: fnErr } = await supabase.functions.invoke("terminal-readers", {
      body: { action: "list" },
    });
    if (fnErr) throw new Error(fnErr.message || "Failed to list readers");
    if (data?.error) throw new Error(data.error);
    return (data?.readers || []).map(mapReader);
  }, []);

  const rediscoverReaders = useCallback(async (): Promise<TerminalReader[]> => {
    try {
      const readers = await listInternetReaders();
      setAvailableReaders(readers);
      return readers;
    } catch (err: any) {
      console.warn("[Terminal] Rediscover failed:", err?.message);
      setAvailableReaders([]);
      return [];
    }
  }, [listInternetReaders]);

  const scheduleReconnect = useCallback((delayMs = 8000) => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    reconnectTimer.current = setTimeout(() => {
      connect();
    }, delayMs);
  }, []);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    try {
      const readers = await listInternetReaders();
      setAvailableReaders(readers);

      const onlineReaders = readers.filter((r) => r.status === "online");
      if (readers.length === 0) {
        setReader(null);
        setStatus("offline");
        return;
      }

      const lastId = typeof window !== "undefined" ? localStorage.getItem(LAST_READER_KEY) : null;
      const remembered = lastId ? readers.find((r) => r.id === lastId) : undefined;

      let chosen: TerminalReader | undefined;
      if (remembered && remembered.status === "online") chosen = remembered;
      else if (onlineReaders.length === 1) chosen = onlineReaders[0];

      if (chosen) {
        setReader(chosen);
        setStatus("connected");
        try { localStorage.setItem(LAST_READER_KEY, chosen.id); } catch { /* ignore */ }
      } else {
        setReader(null);
        setStatus("offline");
      }
    } catch (err: any) {
      const msg = err?.message || "Connection failed";
      console.warn("[Terminal] connect failed:", msg);
      const lower = msg.toLowerCase();
      if (lower.includes("not configured") || lower.includes("stripe terminal is not enabled") || lower.includes("not a connect")) {
        setStatus("not_configured");
      } else {
        setStatus("offline");
      }
      setError(msg);
      setAvailableReaders([]);
    }
  }, [listInternetReaders]);

  const connectToReader = useCallback(async (readerId: string) => {
    setStatus("connecting");
    try {
      const readers = await listInternetReaders();
      setAvailableReaders(readers);
      const target = readers.find((r) => r.id === readerId);
      if (!target) throw new Error("Reader not found. It may have been removed.");
      if (target.status !== "online") throw new Error(`${target.label} is offline. Power it on and connect to Wi-Fi.`);
      setReader(target);
      setStatus("connected");
      try { localStorage.setItem(LAST_READER_KEY, target.id); } catch { /* ignore */ }
    } catch (err: any) {
      setStatus("offline");
      setError(err?.message || "Failed to select reader");
    }
  }, [listInternetReaders]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    setReader(null);
    setStatus("offline");
    try { localStorage.removeItem(LAST_READER_KEY); } catch { /* ignore */ }
  }, []);

  const runOnReader = useCallback(async (
    readerId: string, amountMinor: number, currency: string,
  ): Promise<CollectResult> => {
    try {
      const { data: startData, error: startErr } = await supabase.functions.invoke("terminal-readers", {
        body: { action: "process", reader_id: readerId, amount: amountMinor, currency: currency.toLowerCase() },
      });
      if (startErr) throw new Error(startErr.message || "Failed to start payment");
      if (startData?.error) throw new Error(startData.error);

      const piId = String(startData.payment_intent_id);
      lastPaymentRef.current = { readerId, piId, amountMinor, currency };
      cancelRef.current = { piId, readerId };

      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const { data: pollData, error: pollErr } = await supabase.functions.invoke("terminal-readers", {
          body: { action: "poll", payment_intent_id: piId, reader_id: readerId },
        });
        if (pollErr) continue;
        if (pollData?.error) continue;
        const piStatus: string = pollData?.payment_intent?.status || "";
        const lastErr: string | null = pollData?.payment_intent?.last_payment_error;
        if (piStatus === "succeeded") {
          lastPaymentRef.current = null;
          cancelRef.current = null;
          return { success: true, paymentIntentId: piId };
        }
        if (piStatus === "canceled") {
          cancelRef.current = null;
          return { success: false, error: "Payment cancelled.", errorKind: "cancelled", recoverable: true };
        }
        if (piStatus === "requires_payment_method") {
          cancelRef.current = null;
          return {
            success: false,
            error: lastErr || "Card was declined. Try another card.",
            errorKind: "card_declined",
            recoverable: true,
          };
        }
      }
      cancelRef.current = null;
      return {
        success: false,
        error: "Reader timed out. Please try again.",
        errorKind: "reader_disconnected",
        recoverable: true,
      };
    } catch (err: any) {
      cancelRef.current = null;
      const kind = classifyError(err);
      return {
        success: false,
        error: err?.message || "Payment failed",
        errorKind: kind,
        recoverable: kind === "reader_disconnected" || kind === "network",
      };
    }
  }, []);

  const collectPayment = useCallback(async (amountMinor: number, currency: string): Promise<CollectResult> => {
    setIsCollecting(true);
    try {
      if (!reader || status !== "connected") {
        return {
          success: false,
          error: "No card reader selected.",
          errorKind: "reader_disconnected",
          recoverable: true,
        };
      }
      return await runOnReader(reader.id, amountMinor, currency);
    } finally {
      setIsCollecting(false);
    }
  }, [reader, status, runOnReader]);

  const retryLastPayment = useCallback(async (): Promise<CollectResult> => {
    const last = lastPaymentRef.current;
    if (!last) {
      return { success: false, error: "Nothing to retry", errorKind: "unknown", recoverable: false };
    }
    setIsCollecting(true);
    try {
      return await runOnReader(last.readerId, last.amountMinor, last.currency);
    } finally {
      setIsCollecting(false);
    }
  }, [runOnReader]);

  const cancelCollect = useCallback(() => {
    if (isNativeTerminalAvailable()) {
      cancelNativeCollect().catch(() => {});
    }
    const ctx = cancelRef.current;
    if (ctx) {
      supabase.functions.invoke("terminal-readers", {
        body: { action: "cancel", reader_id: ctx.readerId },
      }).catch(() => {});
    }
    cancelRef.current = null;
    setIsCollecting(false);
  }, []);

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
      if (!ok) return { success: false, error: "Failed to initialize Tap to Pay.", errorKind: "unknown", recoverable: false };
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
      const { data: piData, error: piError } = await supabase.functions.invoke("create-terminal-payment", {
        body: { amount: amountMinor, currency: currency.toLowerCase() },
      });
      if (piError || !piData?.client_secret) {
        return { success: false, error: piData?.error || "Failed to create payment intent", errorKind: "network", recoverable: false };
      }
      try {
        const result = await collectAndProcessNative(piData.client_secret);
        return { success: true, paymentIntentId: result.paymentIntentId };
      } catch (e: any) {
        const kind = classifyError(e);
        return { success: false, error: e?.message || "Tap to Pay failed", errorKind: kind, recoverable: kind === "reader_disconnected" || kind === "network" };
      }
    } finally {
      setIsCollecting(false);
    }
  }, []);

  useEffect(() => {
    if (hasAttemptedAutoConnect.current) return;
    hasAttemptedAutoConnect.current = true;
    connect().catch(() => {});
  }, []);

  useEffect(() => {
    if (status === "connected" || status === "connecting" || status === "not_configured") return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      connect().catch(() => {});
    }, 20000);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => () => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
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
