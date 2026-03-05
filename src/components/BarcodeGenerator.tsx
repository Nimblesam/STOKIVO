import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeGeneratorProps {
  value: string;
  format?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  className?: string;
}

export function BarcodeGenerator({
  value,
  format = "CODE128",
  width = 2,
  height = 60,
  displayValue = true,
  className = "",
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
          fontSize: 14,
          background: "transparent",
          lineColor: "#000000",
        });
      } catch {
        // Invalid barcode value — silently ignore
      }
    }
  }, [value, format, width, height, displayValue]);

  if (!value) return null;

  return <svg ref={svgRef} className={className} />;
}

export function generateBarcode(): string {
  // Generate EAN-13 compatible barcode (13 digits with check digit)
  const prefix = "200"; // Internal use prefix
  const random = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("");
  const digits = prefix + random;
  // Calculate EAN-13 check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return digits + check;
}
