import { useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";

/**
 * Global HID barcode scanner listener.
 * Detects rapid keystrokes (scanner emulation) from anywhere in the app,
 * looks up the scanned barcode, and navigates to POS with the product added to cart.
 * Shows a "product not found" alert for unknown barcodes.
 */
export function useGlobalScanner() {
  const { profile } = useAuth();
  const { activeStoreId } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const processingRef = useRef(false);

  const handleBarcode = useCallback(async (barcode: string) => {
    if (processingRef.current || !profile?.company_id) return;
    processingRef.current = true;

    try {
      let q = supabase
        .from("products")
        .select("id, name, barcode, selling_price, stock_qty")
        .eq("company_id", profile.company_id)
        .eq("barcode", barcode);
      if (activeStoreId) q = q.eq("store_id", activeStoreId);
      const { data } = await q.maybeSingle();

      if (data) {
        // Dispatch custom event with product data for POS to pick up
        window.dispatchEvent(new CustomEvent("global-barcode-scan", { detail: data }));
        // Navigate to POS if not already there
        if (location.pathname !== "/pos") {
          navigate("/pos");
        }
        toast.success(`${data.name} scanned`, { duration: 1500 });
      } else {
        toast.error("Product not found", {
          description: `No product matches barcode "${barcode}". Add it in Products first.`,
          duration: 4000,
        });
      }
    } catch {
      // silently fail
    } finally {
      processingRef.current = false;
    }
  }, [profile?.company_id, activeStoreId, navigate, location.pathname]);

  useEffect(() => {
    const SCAN_SPEED_THRESHOLD = 50; // ms between keys for scanner
    const MIN_LENGTH = 4;

    const handler = (e: KeyboardEvent) => {
      // Skip if user is focused on an input/textarea (let the POS scan field handle it)
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
}
