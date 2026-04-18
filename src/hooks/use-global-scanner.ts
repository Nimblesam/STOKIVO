import { useEffect, useRef, useCallback, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";

export interface UnknownBarcodeEvent {
  barcode: string;
}

/**
 * Global HID barcode scanner listener.
 * Detects rapid keystrokes (scanner emulation) from anywhere in the app,
 * looks up the scanned barcode, and navigates to POS with the product added to cart.
 * Shows an "add product" prompt for unknown barcodes.
 */
export function useGlobalScanner() {
  const { profile } = useAuth();
  const { activeStoreId } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const processingRef = useRef(false);
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);

  const handleBarcode = useCallback(async (barcode: string) => {
    if (processingRef.current || !profile?.company_id) return;
    processingRef.current = true;

    try {
      let q = supabase
        .from("products")
        .select("id, name, barcode, selling_price, stock_qty, image_url")
        .eq("company_id", profile.company_id)
        .eq("barcode", barcode);
      if (activeStoreId) q = q.eq("store_id", activeStoreId);
      const { data } = await q.maybeSingle();

      if (data) {
        const dispatchScan = () => {
          window.dispatchEvent(new CustomEvent("global-barcode-scan", { detail: data }));
        };
        if (location.pathname !== "/pos") {
          navigate("/pos");
          // Wait for Cashier to mount its listener before dispatching
          setTimeout(dispatchScan, 250);
        } else {
          dispatchScan();
        }
        toast.success(`${data.name} scanned`, { duration: 1500 });
      } else {
        // Set unknown barcode state to trigger dialog
        setUnknownBarcode(barcode);
      }
    } catch {
      // silently fail
    } finally {
      processingRef.current = false;
    }
  }, [profile?.company_id, activeStoreId, navigate, location.pathname]);

  useEffect(() => {
    const SCAN_SPEED_THRESHOLD = 50;
    const MIN_LENGTH = 4;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const now = Date.now();

      if (e.key === "Enter" && bufferRef.current.length >= MIN_LENGTH) {
        const timeSinceLastKey = now - lastKeyTimeRef.current;
        if (timeSinceLastKey < SCAN_SPEED_THRESHOLD * 3) {
          e.preventDefault();
          const barcode = bufferRef.current;
          bufferRef.current = "";
          handleBarcode(barcode);
          return;
        }
      }

      if (e.key.length === 1) {
        if (now - lastKeyTimeRef.current < SCAN_SPEED_THRESHOLD) {
          bufferRef.current += e.key;
        } else {
          bufferRef.current = e.key;
        }
        lastKeyTimeRef.current = now;
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [handleBarcode]);

  return { unknownBarcode, clearUnknownBarcode: () => setUnknownBarcode(null) };
}
