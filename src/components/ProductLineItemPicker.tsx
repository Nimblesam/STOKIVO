import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Package, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
 * Uses Radix Popover so the dropdown is portaled to <body> and never clipped
 * by parent overflow containers (sticky footers / scrollable dialog body).
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

  const selected = products.find((p) => p.id === value);

  const filtered = search.trim()
    ? products.filter((p) => {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q);
      })
    : products;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full flex-1 min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left",
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
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="p-0 w-[--radix-popover-trigger-width] max-w-[calc(100vw-1.5rem)]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="h-9 pl-8"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto overscroll-contain">
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
      </PopoverContent>
    </Popover>
  );
}
