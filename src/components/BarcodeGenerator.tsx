import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export type BarcodeFormat = "CODE128" | "EAN13" | "EAN8" | "UPC" | "CODE39" | "ITF14";

export const BARCODE_FORMATS: { value: BarcodeFormat; label: string; description: string; digitLength?: number }[] = [
  { value: "CODE128", label: "CODE128", description: "General purpose, alphanumeric" },
  { value: "EAN13", label: "EAN-13", description: "European retail (13 digits)", digitLength: 13 },
  { value: "EAN8", label: "EAN-8", description: "Small products (8 digits)", digitLength: 8 },
  { value: "UPC", label: "UPC-A", description: "North American retail (12 digits)", digitLength: 12 },
  { value: "CODE39", label: "CODE39", description: "Industrial, alphanumeric" },
  { value: "ITF14", label: "ITF-14", description: "Shipping cartons (14 digits)", digitLength: 14 },
];

interface BarcodeGeneratorProps {
  value: string;
  format?: BarcodeFormat;
  width?: number;
  height?: number;
  displayValue?: boolean;
  className?: string;
  fontSize?: number;
}

export function BarcodeGenerator({
  value,
  format = "CODE128",
  width = 2,
  height = 60,
  displayValue = true,
  className = "",
  fontSize = 14,
}: BarcodeGeneratorProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          displayValue,
          margin: 8,
          fontSize,
          background: "transparent",
          lineColor: "#000000",
        });
      } catch {
        // Invalid barcode value for this format
      }
    }
  }, [value, format, width, height, displayValue, fontSize]);

  if (!value) return null;

  return <svg ref={svgRef} className={className} />;
}

/** Calculate check digit for EAN/UPC barcodes */
function calcCheckDigit(digits: string): number {
  let sum = 0;
  const len = digits.length;
  for (let i = 0; i < len; i++) {
    sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

/** Generate a barcode value for a given format */
export function generateBarcode(format: BarcodeFormat = "EAN13"): string {
  switch (format) {
    case "EAN13": {
      const prefix = "200";
      const random = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("");
      const digits = prefix + random;
      return digits + calcCheckDigit(digits);
    }
    case "EAN8": {
      const prefix = "20";
      const random = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10)).join("");
      const digits = prefix + random;
      return digits + calcCheckDigit(digits);
    }
    case "UPC": {
      const prefix = "2";
      const random = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join("");
      const digits = prefix + random;
      return digits + calcCheckDigit(digits);
    }
    case "ITF14": {
      const prefix = "1200";
      const random = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("");
      const digits = prefix + random;
      return digits + calcCheckDigit(digits);
    }
    case "CODE39":
    case "CODE128":
    default: {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const prefix = "ZS-";
      const random = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      return prefix + random;
    }
  }
}

/** Validate if a barcode value is valid for a given format */
export function validateBarcode(value: string, format: BarcodeFormat): { valid: boolean; error?: string } {
  if (!value) return { valid: false, error: "Barcode value is required" };
  
  switch (format) {
    case "EAN13":
      if (!/^\d{13}$/.test(value)) return { valid: false, error: "EAN-13 must be exactly 13 digits" };
      break;
    case "EAN8":
      if (!/^\d{8}$/.test(value)) return { valid: false, error: "EAN-8 must be exactly 8 digits" };
      break;
    case "UPC":
      if (!/^\d{12}$/.test(value)) return { valid: false, error: "UPC-A must be exactly 12 digits" };
      break;
    case "ITF14":
      if (!/^\d{14}$/.test(value)) return { valid: false, error: "ITF-14 must be exactly 14 digits" };
      break;
    case "CODE39":
      if (!/^[A-Z0-9\-. $/+%]+$/i.test(value)) return { valid: false, error: "CODE39 only supports A-Z, 0-9, and - . $ / + % SPACE" };
      break;
    case "CODE128":
      // CODE128 supports all ASCII
      break;
  }
  return { valid: true };
}
