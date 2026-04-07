import { useState } from "react";
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
  const { profile } = useAuth();
  const { activeStoreId } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", sku: "", cost_price: "", selling_price: "", stock_qty: "1", min_stock_level: "5",
  });

  const handleAdd = async () => {
    if (!form.name.trim() || !form.sku.trim() || !profile?.company_id) {
      toast.error("Name and SKU are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("products").insert({
      company_id: profile.company_id,
      store_id: activeStoreId,
      name: form.name,
      sku: form.sku,
      barcode,
      cost_price: Math.round(parseFloat(form.cost_price || "0") * 100),
      selling_price: Math.round(parseFloat(form.selling_price || "0") * 100),
      stock_qty: parseInt(form.stock_qty || "0"),
      min_stock_level: parseInt(form.min_stock_level || "5"),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${form.name} added successfully!`);
      setShowForm(false);
      setForm({ name: "", sku: "", cost_price: "", selling_price: "", stock_qty: "1", min_stock_level: "5" });
      onClose();
    }
  };

  const handleClose = () => {
    setShowForm(false);
    setForm({ name: "", sku: "", cost_price: "", selling_price: "", stock_qty: "1", min_stock_level: "5" });
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
      <DialogContent className="max-w-md">
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
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Indomie Carton" className="mt-1" autoFocus />
          </div>
          <div>
            <Label>SKU *</Label>
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. IND-001" className="mt-1" />
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
          <Button onClick={handleAdd} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving}>
            {saving ? "Saving..." : "Add Product"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
