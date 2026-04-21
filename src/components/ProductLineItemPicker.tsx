import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";
import type { Currency } from "@/lib/types";

interface ProductOption {
  id: string;
  name: string;
  selling_price: number;
  sku?: string | null;
}

interface ProductLineItemPickerProps {
  products: ProductOption[];
  value: string; // product id
  onChange: (productId: string) => void;
  currency: Currency;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Searchable, scrollable combobox for picking a product into an invoice line.
 * Shows live data sourced from the products list passed by the parent.
 */
export function ProductLineItemPicker({
  products,
  value,
  onChange,
  currency,
  placeholder = "Search product by name or SKU...",
  disabled,
}: ProductLineItemPickerProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = products.find((p) => p.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = search.trim()
    ? products.filter((p) => {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q);
      })
    : products;

  return (
    <div ref={wrapperRef} className="relative flex-1 min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <span className="truncate">
          {selected ? (
            <>
              <span className="font-medium">{selected.name}</span>
              <span className="text-muted-foreground ml-2">— {formatMoney(selected.selling_price, currency)}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Select product</span>
          )}
        </span>
        <Search className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
          <div className="p-2 border-b border-border">
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="h-9"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                <Package className="h-5 w-5 mx-auto mb-1 opacity-40" />
                No products match
              </div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChange(p.id);
                    setSearch("");
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between gap-2",
                    p.id === value && "bg-accent/40",
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    {p.sku && <p className="text-xs text-muted-foreground truncate">SKU: {p.sku}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatMoney(p.selling_price, currency)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
