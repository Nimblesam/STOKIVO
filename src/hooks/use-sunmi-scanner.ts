import { useEffect } from "react";
import { onSunmiBarcode } from "@/lib/sunmi-service";

/**
 * Bridges SUNMI native scanner broadcasts to the same `global-barcode-scan`
 * event the rest of the app already listens to (HID scanner path).
 *
 * Mount once near the app root (PosLayout) so cashiers don't have to focus
 * any input — scans are caught system-wide.
 */
export function useSunmiScanner(onBarcode: (barcode: string) => void) {
  useEffect(() => {
    const unsubscribe = onSunmiBarcode((code) => onBarcode(code));
    return () => unsubscribe();
  }, [onBarcode]);
}
