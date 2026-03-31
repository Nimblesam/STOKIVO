import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { BarcodeGenerator, BARCODE_FORMATS, BarcodeFormat, generateBarcode, validateBarcode } from "@/components/BarcodeGenerator";
import { BarcodePrintView } from "@/components/BarcodePrintView";
import { formatMoney } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Package, Barcode, Loader2, MoreHorizontal, Pencil, Trash2, Printer, RefreshCw, Wand2, Download, ScanBarcode, CalendarClock, Tag, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Currency } from "@/lib/types";

const emptyForm = {
  name: "", sku: "", barcode: "", category: "", unit_type: "unit",
  cost_price: "", selling_price: "", stock_qty: "", min_stock_level: "5",
  supplier_id: "", expiry_date: "",
};

export default function Products() {
  const { profile, company, role } = useAuth();
  const currency = (company?.currency || "GBP") as Currency;
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [barcodeProduct, setBarcodeProduct] = useState<any | null>(null);
  const [barcodeViewFormat, setBarcodeViewFormat] = useState<BarcodeFormat>("CODE128");
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>("EAN13");
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Batch print
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPrintView, setShowPrintView] = useState(false);

  const fetchProducts = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, [profile?.company_id]);

  // Fetch suppliers
  useEffect(() => {
    if (!profile?.company_id) return;
    supabase.from("suppliers").select("id, name").eq("company_id", profile.company_id)
      .order("name").then(({ data }) => setSuppliers(data || []));
  }, [profile?.company_id]);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode || "").toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setBarcodeFormat("EAN13");
    setShowDialog(true);
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || "",
      category: product.category || "",
      unit_type: product.unit_type || "unit",
      cost_price: (product.cost_price / 100).toFixed(2),
      selling_price: (product.selling_price / 100).toFixed(2),
      stock_qty: String(product.stock_qty),
      min_stock_level: String(product.min_stock_level),
      supplier_id: product.supplier_id || "",
      expiry_date: product.expiry_date || "",
    });
    setShowDialog(true);
  };

  const handleGenerateBarcode = () => {
    const code = generateBarcode(barcodeFormat);
    setForm({ ...form, barcode: code });
    toast.success(`${barcodeFormat} barcode generated`);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.sku.trim()) {
      toast.error("Name and SKU are required");
      return;
    }
    if (form.barcode) {
      const validation = validateBarcode(form.barcode, barcodeFormat);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }
    }
    if (!profile?.company_id) return;
    setSaving(true);
    const costPrice = Math.round(parseFloat(form.cost_price || "0") * 100);
    const sellingPrice = Math.round(parseFloat(form.selling_price || "0") * 100);

    const payload = {
      name: form.name,
      sku: form.sku,
      barcode: form.barcode || null,
      category: form.category || null,
      unit_type: form.unit_type as any,
      cost_price: costPrice,
      selling_price: sellingPrice,
      stock_qty: parseInt(form.stock_qty || "0"),
      min_stock_level: parseInt(form.min_stock_level || "5"),
      supplier_id: form.supplier_id || null,
      expiry_date: form.expiry_date || null,
    };

    let error;
    if (editingProduct) {
      ({ error } = await supabase.from("products").update(payload).eq("id", editingProduct.id));
    } else {
      ({ error } = await supabase.from("products").insert({ ...payload, company_id: profile.company_id }));
    }

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editingProduct ? "Product updated!" : "Product added!");
      setShowDialog(false);
      setForm(emptyForm);
      setEditingProduct(null);
      fetchProducts();
    }
    setSaving(false);
  };

  const handleDelete = async (product: any) => {
    if (!confirm(`Delete "${product.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) toast.error(error.message);
    else { toast.success("Product deleted"); fetchProducts(); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  };

  const selectedProducts = products.filter(p => selectedIds.has(p.id));

  // Detect format from barcode value for viewing
  const detectFormat = (barcode: string): BarcodeFormat => {
    if (/^\d{13}$/.test(barcode)) return "EAN13";
    if (/^\d{8}$/.test(barcode)) return "EAN8";
    if (/^\d{12}$/.test(barcode)) return "UPC";
    if (/^\d{14}$/.test(barcode)) return "ITF14";
    return "CODE128";
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Products"
        subtitle={`${products.length} products in inventory`}
        actions={
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <Button variant="outline" className="gap-2" onClick={() => setShowPrintView(true)}>
                <Printer className="h-4 w-4" /> Print {selectedIds.size} Labels
              </Button>
            )}
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </div>
        }
      />

      <div className="zentra-card">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, SKU, barcode, or category..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button variant="outline" className="gap-2" onClick={() => {
            const lines = ["Name,SKU,Barcode,Category,Unit Type,Cost Price,Selling Price,Stock Qty,Min Stock"];
            filtered.forEach(p => {
              lines.push(`"${p.name}","${p.sku}","${p.barcode || ""}","${p.category || ""}","${p.unit_type}",${(p.cost_price/100).toFixed(2)},${(p.selling_price/100).toFixed(2)},${p.stock_qty},${p.min_stock_level}`);
            });
            const blob = new Blob([lines.join("\n")], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = "products.csv"; a.click();
            URL.revokeObjectURL(url);
          }}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>{search ? "No products match your search" : "No products yet. Add your first product!"}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => {
                  const stockStatus = product.stock_qty <= product.min_stock_level * 0.5
                    ? "critical"
                    : product.stock_qty <= product.min_stock_level
                    ? "low_stock"
                    : "in_stock";
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(product.id)}
                          onCheckedChange={() => toggleSelect(product.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.unit_type}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{product.sku}</TableCell>
                      <TableCell className="text-sm">{product.category || "—"}</TableCell>
                      <TableCell className="text-right text-sm">{formatMoney(product.cost_price, currency)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatMoney(product.selling_price, currency)}</TableCell>
                      <TableCell className="text-right">
                        <span className={`text-sm font-medium ${(product.profit_margin || 0) < 10 ? "text-destructive" : (product.profit_margin || 0) > 40 ? "text-success" : "text-foreground"}`}>
                          {(product.profit_margin || 0).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">{product.stock_qty}</TableCell>
                      <TableCell><StatusBadge status={stockStatus} /></TableCell>
                      <TableCell>
                        {product.expiry_date ? (() => {
                          const daysLeft = Math.ceil((new Date(product.expiry_date).getTime() - Date.now()) / 86400000);
                          return (
                            <span className={`text-xs font-medium ${daysLeft <= 0 ? "text-destructive" : daysLeft <= 30 ? "text-warning" : "text-muted-foreground"}`}>
                              {daysLeft <= 0 ? "Expired" : daysLeft <= 30 ? `${daysLeft}d left` : new Date(product.expiry_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                            </span>
                          );
                        })() : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {product.barcode ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            setBarcodeProduct(product);
                            setBarcodeViewFormat(detectFormat(product.barcode));
                          }}>
                            <Barcode className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(product)}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit Product
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setBarcodeProduct(product);
                              setBarcodeViewFormat(detectFormat(product.barcode || product.sku));
                            }}>
                              <Barcode className="h-4 w-4 mr-2" /> View Barcode
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedIds(new Set([product.id]));
                              setShowPrintView(true);
                            }}>
                              <Printer className="h-4 w-4 mr-2" /> Print Label
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {role === "owner" && (
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(product)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Add/Edit Product Dialog */}
      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) { setShowDialog(false); setEditingProduct(null); } else setShowDialog(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Indomie Carton" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>SKU *</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. IND-001" className="mt-1" />
              </div>
              <div>
                <Label>Barcode Format</Label>
                <Select value={barcodeFormat} onValueChange={(v) => setBarcodeFormat(v as BarcodeFormat)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BARCODE_FORMATS.map(f => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Barcode Value</Label>
              <p className="text-[10px] text-muted-foreground mb-1">Type manually, scan with a scanner, or auto-generate</p>
              <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                  <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    placeholder={`Enter, scan, or generate ${barcodeFormat}`}
                    className="pl-10 font-mono"
                    autoFocus={false}
                  />
                </div>
                <Button type="button" variant="outline" size="icon" onClick={handleGenerateBarcode} title="Auto-generate barcode">
                  <Wand2 className="h-4 w-4" />
                </Button>
              </div>
              {form.barcode && (
                <div className="mt-2 flex justify-center p-2 bg-white rounded border">
                  <BarcodeGenerator value={form.barcode} format={barcodeFormat} height={40} width={1.5} fontSize={10} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Food" className="mt-1" />
              </div>
              <div>
                <Label>Unit Type</Label>
                <select value={form.unit_type} onChange={(e) => setForm({ ...form, unit_type: e.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="unit">Unit</option>
                  <option value="carton">Carton</option>
                  <option value="bag">Bag</option>
                  <option value="kg">Kg</option>
                  <option value="bottle">Bottle</option>
                  <option value="tin">Tin</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Supplier</Label>
              <select
                value={form.supplier_id}
                onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">No supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">Link to a supplier for reorder & price tracking</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cost Price</Label>
                <Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} placeholder="0.00" className="mt-1" />
              </div>
              <div>
                <Label>Selling Price</Label>
                <Input type="number" step="0.01" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} placeholder="0.00" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Stock Qty</Label>
                <Input type="number" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} placeholder="0" className="mt-1" />
              </div>
              <div>
                <Label>Min Stock Level</Label>
                <Input type="number" value={form.min_stock_level} onChange={(e) => setForm({ ...form, min_stock_level: e.target.value })} placeholder="5" className="mt-1" />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving}>
              {saving ? "Saving..." : editingProduct ? "Update Product" : "Add Product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Barcode View Dialog */}
      <Dialog open={!!barcodeProduct} onOpenChange={() => setBarcodeProduct(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{barcodeProduct?.name} — Barcode</DialogTitle>
          </DialogHeader>
          {barcodeProduct && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Format</Label>
                <Select value={barcodeViewFormat} onValueChange={(v) => setBarcodeViewFormat(v as BarcodeFormat)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BARCODE_FORMATS.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label} — {f.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col items-center gap-3 py-4 bg-white rounded-lg border p-4">
                <BarcodeGenerator
                  value={barcodeProduct.barcode || barcodeProduct.sku}
                  format={barcodeViewFormat}
                  height={80}
                  width={2}
                />
                <p className="text-xs text-muted-foreground font-mono">{barcodeProduct.barcode || barcodeProduct.sku}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => {
                  setSelectedIds(new Set([barcodeProduct.id]));
                  setBarcodeProduct(null);
                  setShowPrintView(true);
                }}>
                  <Printer className="h-4 w-4" /> Print Label
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Compatible with Dymo, Zebra, Brother, and all standard barcode scanners
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Batch Print View */}
      <BarcodePrintView
        open={showPrintView}
        onOpenChange={(open) => {
          setShowPrintView(open);
          if (!open) setSelectedIds(new Set());
        }}
        products={selectedProducts.map(p => ({
          id: p.id,
          name: p.name,
          barcode: p.barcode || p.sku,
          sku: p.sku,
          selling_price: p.selling_price,
        }))}
        barcodeFormat={barcodeViewFormat}
        currency={currency}
      />
    </div>
  );
}
