import { BarcodeGenerator, BarcodeFormat } from "@/components/BarcodeGenerator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, X } from "lucide-react";
import { useState, useRef } from "react";

export type LabelSize = "dymo_30252" | "zebra_2x1" | "brother_29mm" | "avery_5160" | "custom";

const LABEL_SIZES: { value: LabelSize; label: string; description: string; widthMm: number; heightMm: number; columns: number }[] = [
  { value: "dymo_30252", label: "Dymo 30252", description: "28×89mm (address)", widthMm: 89, heightMm: 28, columns: 1 },
  { value: "zebra_2x1", label: "Zebra 2×1\"", description: "51×25mm (standard)", widthMm: 51, heightMm: 25, columns: 1 },
  { value: "brother_29mm", label: "Brother 29mm", description: "29mm continuous", widthMm: 62, heightMm: 29, columns: 1 },
  { value: "avery_5160", label: "Avery 5160", description: "A4 sheet (30 labels)", widthMm: 66, heightMm: 25, columns: 3 },
  { value: "custom", label: "A4 Grid", description: "Custom A4 grid layout", widthMm: 60, heightMm: 30, columns: 3 },
];

interface PrintProduct {
  id: string;
  name: string;
  barcode: string;
  sku: string;
  selling_price?: number;
}

interface BarcodePrintViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: PrintProduct[];
  barcodeFormat?: BarcodeFormat;
  currency?: string;
}

export function BarcodePrintView({ open, onOpenChange, products, barcodeFormat = "CODE128", currency }: BarcodePrintViewProps) {
  const [labelSize, setLabelSize] = useState<LabelSize>("avery_5160");
  const [copies, setCopies] = useState(1);
  const [showPrice, setShowPrice] = useState(true);
  const [showName, setShowName] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const selectedSize = LABEL_SIZES.find(l => l.value === labelSize) || LABEL_SIZES[4];

  const allLabels = products.flatMap(p =>
    Array.from({ length: copies }, (_, i) => ({ ...p, key: `${p.id}-${i}` }))
  );

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Barcodes</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { 
            size: ${selectedSize.columns > 1 ? 'A4' : `${selectedSize.widthMm}mm ${selectedSize.heightMm}mm`}; 
            margin: ${selectedSize.columns > 1 ? '10mm' : '0'};
          }
          body { font-family: Arial, Helvetica, sans-serif; }
          .label-grid {
            display: grid;
            grid-template-columns: repeat(${selectedSize.columns}, 1fr);
            gap: 2mm;
          }
          .label {
            width: ${selectedSize.widthMm}mm;
            height: ${selectedSize.heightMm}mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            padding: 1mm;
            page-break-inside: avoid;
          }
          .label-name {
            font-size: 7pt;
            font-weight: bold;
            text-align: center;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            margin-bottom: 0.5mm;
          }
          .label-price {
            font-size: 6pt;
            text-align: center;
            margin-top: 0.5mm;
          }
          svg { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <div class="label-grid">
          ${printContent.innerHTML}
        </div>
        <script>window.onload = function() { window.print(); window.close(); }<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const barcodeHeight = Math.min(40, selectedSize.heightMm * 0.6);
  const barcodeWidth = selectedSize.widthMm < 55 ? 1.2 : 1.5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" /> Print Barcode Labels
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <Label className="text-xs">Label Size</Label>
            <Select value={labelSize} onValueChange={(v) => setLabelSize(v as LabelSize)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LABEL_SIZES.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    <div>
                      <span className="font-medium">{s.label}</span>
                      <span className="text-xs text-muted-foreground ml-1">({s.description})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Copies per product</Label>
            <Input type="number" min={1} max={100} value={copies} onChange={e => setCopies(Math.max(1, parseInt(e.target.value) || 1))} className="mt-1" />
          </div>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={showName} onChange={e => setShowName(e.target.checked)} className="rounded" />
              Name
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)} className="rounded" />
              Price
            </label>
          </div>
          <div className="flex items-end">
            <Button onClick={handlePrint} className="w-full gap-2">
              <Printer className="h-4 w-4" /> Print {allLabels.length} Labels
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mb-2">
          Preview ({products.length} products × {copies} copies = {allLabels.length} labels)
        </div>

        {/* Visual preview */}
        <div className="border rounded-lg p-4 bg-white overflow-auto max-h-[400px]">
          <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${selectedSize.columns}, 1fr)` }}>
            {allLabels.map(item => (
              <div
                key={item.key}
                className="border border-dashed border-muted-foreground/30 rounded flex flex-col items-center justify-center p-1 bg-white"
                style={{ minHeight: `${selectedSize.heightMm * 2.5}px` }}
              >
                {showName && <p className="text-[9px] font-semibold text-center truncate max-w-full text-black">{item.name}</p>}
                <BarcodeGenerator
                  value={item.barcode || item.sku}
                  format={barcodeFormat}
                  height={barcodeHeight}
                  width={barcodeWidth}
                  displayValue={true}
                  fontSize={9}
                />
                {showPrice && item.selling_price !== undefined && (
                  <p className="text-[8px] text-black">{(item.selling_price / 100).toFixed(2)}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Hidden print content */}
        <div ref={printRef} className="hidden">
          {allLabels.map(item => (
            <div key={item.key} className="label">
              {showName && <div className="label-name">{item.name}</div>}
              <BarcodeGenerator
                value={item.barcode || item.sku}
                format={barcodeFormat}
                height={barcodeHeight}
                width={barcodeWidth}
                displayValue={true}
                fontSize={8}
              />
              {showPrice && item.selling_price !== undefined && (
                <div className="label-price">{(item.selling_price / 100).toFixed(2)}</div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
