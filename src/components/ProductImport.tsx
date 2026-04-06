import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PRODUCT_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "sku", label: "SKU", required: true },
  { key: "barcode", label: "Barcode", required: false },
  { key: "category", label: "Category", required: false },
  { key: "unit_type", label: "Unit Type", required: false },
  { key: "cost_price", label: "Cost Price", required: false },
  { key: "selling_price", label: "Selling Price", required: false },
  { key: "stock_qty", label: "Stock Qty", required: false },
  { key: "min_stock_level", label: "Min Stock Level", required: false },
  { key: "expiry_date", label: "Expiry Date", required: false },
] as const;

type FieldKey = typeof PRODUCT_FIELDS[number]["key"];

const FIELD_ALIASES: Record<string, FieldKey> = {
  "product name": "name", "product": "name", "item": "name", "item name": "name", "description": "name", "title": "name",
  "sku": "sku", "sku code": "sku", "product code": "sku", "code": "sku", "item code": "sku", "article": "sku",
  "barcode": "barcode", "bar code": "barcode", "upc": "barcode", "ean": "barcode", "gtin": "barcode",
  "category": "category", "type": "category", "group": "category", "department": "category", "product category": "category",
  "unit type": "unit_type", "unit": "unit_type", "uom": "unit_type", "measure": "unit_type", "unit of measure": "unit_type",
  "cost price": "cost_price", "cost": "cost_price", "purchase price": "cost_price", "buy price": "cost_price", "wholesale price": "cost_price", "buying price": "cost_price",
  "selling price": "selling_price", "price": "selling_price", "sell price": "selling_price", "retail price": "selling_price", "sale price": "selling_price", "unit price": "selling_price",
  "stock qty": "stock_qty", "stock": "stock_qty", "quantity": "stock_qty", "qty": "stock_qty", "stock quantity": "stock_qty", "on hand": "stock_qty", "available": "stock_qty", "inventory": "stock_qty",
  "min stock level": "min_stock_level", "min stock": "min_stock_level", "reorder level": "min_stock_level", "minimum stock": "min_stock_level", "reorder point": "min_stock_level",
  "expiry date": "expiry_date", "expiry": "expiry_date", "expiration": "expiry_date", "exp date": "expiry_date", "best before": "expiry_date", "use by": "expiry_date",
};

const VALID_UNITS = ["bag", "carton", "unit", "kg", "bottle", "tin"];

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine).filter(r => r.some(c => c));
  return { headers, rows };
}

function autoMapColumns(headers: string[]): Record<number, FieldKey> {
  const mapping: Record<number, FieldKey> = {};
  const usedFields = new Set<FieldKey>();

  headers.forEach((h, i) => {
    const normalized = h.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
    const match = FIELD_ALIASES[normalized];
    if (match && !usedFields.has(match)) {
      mapping[i] = match;
      usedFields.add(match);
    }
  });

  return mapping;
}

function parsePrice(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[£$€,\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

function parseUnit(val: string): string {
  const lower = val.toLowerCase().trim();
  if (VALID_UNITS.includes(lower)) return lower;
  if (lower.includes("carton") || lower.includes("ctn")) return "carton";
  if (lower.includes("bag")) return "bag";
  if (lower.includes("kg") || lower.includes("kilo")) return "kg";
  if (lower.includes("bottle") || lower.includes("btl")) return "bottle";
  if (lower.includes("tin") || lower.includes("can")) return "tin";
  return "unit";
}

function parseDate(val: string): string | null {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

interface ProductImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  storeId: string | null;
  onComplete: () => void;
  existingCount: number;
  maxProducts: number;
}

export function ProductImport({ open, onOpenChange, companyId, storeId, onComplete, existingCount, maxProducts }: ProductImportProps) {
  const [step, setStep] = useState<"upload" | "map" | "preview" | "importing">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, FieldKey>>({});
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setImportResult(null);
  };

  const handleFile = useCallback((file: File) => {
    if (!file.name.match(/\.(csv|tsv|txt)$/i)) {
      toast.error("Please upload a CSV file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text);
      if (h.length === 0 || r.length === 0) {
        toast.error("File appears empty or invalid");
        return;
      }
      setHeaders(h);
      setRows(r);
      const autoMap = autoMapColumns(h);
      setMapping(autoMap);
      const mappedCount = Object.keys(autoMap).length;
      toast.success(`Found ${r.length} rows, auto-mapped ${mappedCount} columns`);
      setStep("map");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const mappedProducts = rows.map((row) => {
    const product: Record<string, any> = {};
    Object.entries(mapping).forEach(([colIdx, field]) => {
      const val = row[Number(colIdx)] || "";
      switch (field) {
        case "cost_price":
        case "selling_price":
          product[field] = parsePrice(val);
          break;
        case "stock_qty":
        case "min_stock_level":
          product[field] = parseInt(val) || 0;
          break;
        case "unit_type":
          product[field] = parseUnit(val);
          break;
        case "expiry_date":
          product[field] = parseDate(val);
          break;
        default:
          product[field] = val;
      }
    });
    return product;
  });

  const hasRequiredFields = () => {
    const mappedFields = new Set(Object.values(mapping));
    return mappedFields.has("name");
  };

  const handleImport = async () => {
    if (!hasRequiredFields()) {
      toast.error("At least the Name column must be mapped");
      return;
    }

    const available = maxProducts < Infinity ? maxProducts - existingCount : Infinity;
    const toImport = mappedProducts.slice(0, available === Infinity ? undefined : available);

    if (toImport.length < mappedProducts.length) {
      toast.warning(`Only importing ${toImport.length} of ${mappedProducts.length} products due to plan limit`);
    }

    setStep("importing");
    const errors: string[] = [];
    let success = 0;
    const batchSize = 50;

    for (let i = 0; i < toImport.length; i += batchSize) {
      const batch = toImport.slice(i, i + batchSize).map((p, idx) => {
        const name = (p.name || "").trim();
        if (!name) {
          errors.push(`Row ${i + idx + 2}: Missing product name`);
          return null;
        }
        return {
          company_id: companyId,
          store_id: storeId,
          name,
          sku: (p.sku || `IMP-${String(i + idx + 1).padStart(4, "0")}`).trim(),
          barcode: p.barcode || null,
          category: p.category || null,
          unit_type: (p.unit_type || "unit") as any,
          cost_price: p.cost_price || 0,
          selling_price: p.selling_price || 0,
          stock_qty: p.stock_qty || 0,
          min_stock_level: p.min_stock_level ?? 5,
          expiry_date: p.expiry_date || null,
        };
      }).filter(Boolean);

      if (batch.length === 0) continue;

      const { error } = await supabase.from("products").insert(batch as any[]);
      if (error) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else {
        success += batch.length;
      }
    }

    setImportResult({ success, errors });
    if (success > 0) {
      toast.success(`Imported ${success} products successfully!`);
      onComplete();
    }
    if (errors.length > 0) {
      toast.error(`${errors.length} errors during import`);
    }
  };

  const updateMapping = (colIdx: number, field: string) => {
    setMapping(prev => {
      const next = { ...prev };
      if (field === "skip") {
        delete next[colIdx];
      } else {
        // Remove the field from any other column
        Object.keys(next).forEach(k => {
          if (next[Number(k)] === field) delete next[Number(k)];
        });
        next[colIdx] = field as FieldKey;
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {step === "upload" && "Import Products from CSV"}
            {step === "map" && "Map Columns to Product Fields"}
            {step === "preview" && "Preview Import"}
            {step === "importing" && "Importing Products..."}
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div
            className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium">Drop your CSV file here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports CSV files. Columns will be automatically detected and mapped.
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Expected columns: Name, SKU, Barcode, Category, Unit Type, Cost Price, Selling Price, Stock Qty, Min Stock Level, Expiry Date
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.txt"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
          </div>
        )}

        {step === "map" && (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              We auto-detected {Object.keys(mapping).length} of {headers.length} columns. Adjust any incorrect mappings below.
            </p>
            <ScrollArea className="flex-1 max-h-[300px]">
              <div className="space-y-2">
                {headers.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <span className="text-sm font-medium min-w-[140px] truncate" title={h}>{h}</span>
                    <span className="text-muted-foreground">→</span>
                    <Select value={mapping[i] || "skip"} onValueChange={(v) => updateMapping(i, v)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">
                          <span className="text-muted-foreground">Skip column</span>
                        </SelectItem>
                        {PRODUCT_FIELDS.map(f => (
                          <SelectItem key={f.key} value={f.key}>
                            {f.label} {f.required && "*"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {mapping[i] && (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex justify-between items-center pt-2 border-t">
              <Button variant="outline" onClick={reset}>Back</Button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{rows.length} rows to import</span>
                <Button onClick={() => setStep("preview")} disabled={!hasRequiredFields()}>
                  Preview Import
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Preview of first 10 products. {rows.length > 10 && `${rows.length - 10} more will also be imported.`}
            </p>
            <ScrollArea className="flex-1 max-h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    {PRODUCT_FIELDS.filter(f => Object.values(mapping).includes(f.key)).map(f => (
                      <TableHead key={f.key}>{f.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedProducts.slice(0, 10).map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      {PRODUCT_FIELDS.filter(f => Object.values(mapping).includes(f.key)).map(f => (
                        <TableCell key={f.key} className="text-sm">
                          {f.key === "cost_price" || f.key === "selling_price"
                            ? `${((p[f.key] || 0) / 100).toFixed(2)}`
                            : String(p[f.key] ?? "—")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            {!Object.values(mapping).includes("sku") && (
              <div className="flex items-center gap-2 text-xs text-warning-foreground bg-warning/10 rounded-lg p-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                No SKU column mapped — auto-generated SKUs (IMP-0001, IMP-0002...) will be assigned.
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t">
              <Button variant="outline" onClick={() => setStep("map")}>Back</Button>
              <Button onClick={handleImport} className="bg-accent text-accent-foreground hover:bg-accent/90">
                Import {rows.length} Products
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="py-12 text-center">
            {importResult ? (
              <div className="space-y-4">
                <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
                <p className="text-lg font-semibold">{importResult.success} products imported!</p>
                {importResult.errors.length > 0 && (
                  <div className="text-left max-h-[150px] overflow-y-auto bg-destructive/5 rounded-lg p-3">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-destructive">{err}</p>
                    ))}
                  </div>
                )}
                <Button onClick={() => { reset(); onOpenChange(false); }}>Done</Button>
              </div>
            ) : (
              <>
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-accent" />
                <p className="text-sm text-muted-foreground mt-3">Importing products...</p>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
