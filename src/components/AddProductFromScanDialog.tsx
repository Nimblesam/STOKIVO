import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";
import { ScanBarcode, Plus, X } from "lucide-react";

interface Props {
  barcode: string;
  open: boolean;
  onClose: () => void;
}

export function AddProductFromScanDialog({ barcode, open, onClose }: Props) {
  const { profile, company } = useAuth();
  const { activeStoreId } = useStore();
  const isRestaurant = company?.business_type === "restaurant";
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "", sku: "", cost_price: "", selling_price: "", stock_qty: "1",
    min_stock_level: "5", category: "", supplier_id: "", expiry_date: "",
    unit_type: "unit",
  });

  useEffect(() => {
    if (!profile?.company_id || !open || isRestaurant) return;
    supabase.from("suppliers").select("id, name").eq("company_id", profile.company_id)
      .then(({ data }) => setSuppliers(data || []));
  }, [profile?.company_id, open, isRestaurant]);

  const handleAdd = async () => {
    if (!form.name.trim() || !profile?.company_id) {
      toast.error("Name is required");
      return;
    }
    const sku = form.sku.trim() || (isRestaurant ? `R-${Date.now().toString(36).toUpperCase()}` : "");
    if (!sku) {
      toast.error("SKU is required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("products").insert({
      company_id: profile.company_id,
      store_id: activeStoreId,
      name: form.name,
      sku,
      barcode,
      cost_price: Math.round(parseFloat(form.cost_price || "0") * 100),
      selling_price: Math.round(parseFloat(form.selling_price || "0") * 100),
      stock_qty: isRestaurant ? 9999 : parseInt(form.stock_qty || "0"),
      min_stock_level: isRestaurant ? 0 : parseInt(form.min_stock_level || "5"),
      category: form.category || null,
      supplier_id: isRestaurant ? null : (form.supplier_id || null),
      expiry_date: isRestaurant ? null : (form.expiry_date || null),
      unit_type: (form.unit_type as any) || "unit",
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${form.name} added successfully!`);
      handleClose();
    }
  };

  const handleClose = () => {
    setShowForm(false);
    setForm({
      name: "", sku: "", cost_price: "", selling_price: "", stock_qty: "1",
      min_stock_level: "5", category: "", supplier_id: "", expiry_date: "",
      unit_type: "unit",
    });
    onClose();
  };

  if (!showForm) {
    return (
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanBarcode className="h-5 w-5 text-destructive" />
              Product Not Found
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              No product matches barcode <span className="font-mono font-semibold text-foreground">"{barcode}"</span>.
            </p>
            <p className="text-sm text-muted-foreground">Would you like to add this product now?</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-1" /> Dismiss
            </Button>
            <Button onClick={() => setShowForm(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-1" /> Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
            <ScanBarcode className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-mono text-foreground">{barcode}</span>
          </div>
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={isRestaurant ? "e.g. Chicken Burger" : "e.g. Indomie Carton"} className="mt-1" autoFocus />
          </div>

          {isRestaurant ? (
            <>
              <div>
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Main Dishes" className="mt-1" />
              </div>
              <div>
                <Label>Selling Price *</Label>
                <Input type="number" step="0.01" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} placeholder="0.00" className="mt-1" />
              </div>
              <div>
                <Label>Cost Price <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} placeholder="0.00" className="mt-1" />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>SKU *</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. IND-001" className="mt-1" />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Food & Beverages" className="mt-1" />
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
              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <Label>Expiry Date</Label>
                  <Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Supplier</Label>
                <select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">No supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </>
          )}

          <Button onClick={handleAdd} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving}>
            {saving ? "Saving..." : "Add Product"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
