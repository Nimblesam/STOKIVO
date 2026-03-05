import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { BarcodeGenerator } from "@/components/BarcodeGenerator";
import { formatMoney } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Package, Barcode, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Currency } from "@/lib/types";

const emptyForm = {
  name: "", sku: "", barcode: "", category: "", unit_type: "unit",
  cost_price: "", selling_price: "", stock_qty: "", min_stock_level: "5",
};

export default function Products() {
  const { profile, company, role } = useAuth();
  const currency = (company?.currency || "GBP") as Currency;
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [barcodeProduct, setBarcodeProduct] = useState<any | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

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

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditingProduct(null);
    setForm(emptyForm);
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
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.sku.trim()) {
      toast.error("Name and SKU are required");
      return;
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

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Products"
        subtitle={`${products.length} products in inventory`}
        actions={
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        }
      />

      <div className="zentra-card">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, SKU, or category..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
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
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Status</TableHead>
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
                        {product.barcode && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBarcodeProduct(product)}>
                            <Barcode className="h-4 w-4 text-muted-foreground" />
                          </Button>
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
                <Label>Barcode</Label>
                <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Optional" className="mt-1" />
              </div>
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

      {/* Barcode Dialog */}
      <Dialog open={!!barcodeProduct} onOpenChange={() => setBarcodeProduct(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{barcodeProduct?.name} — Barcode</DialogTitle>
          </DialogHeader>
          {barcodeProduct && (
            <div className="flex flex-col items-center gap-4 py-4">
              <BarcodeGenerator value={barcodeProduct.barcode || barcodeProduct.sku} format="CODE128" height={80} width={2} />
              <p className="text-xs text-muted-foreground text-center">Code128 format</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
