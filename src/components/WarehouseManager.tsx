import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Warehouse, Plus, ArrowRightLeft, Loader2, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface WarehouseRow {
  id: string;
  name: string;
  address: string | null;
  is_default: boolean;
  created_at: string;
}

export function WarehouseManager() {
  const { profile, role } = useAuth();
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", address: "" });
  const [products, setProducts] = useState<any[]>([]);
  const [transferForm, setTransferForm] = useState({
    from_warehouse_id: "", to_warehouse_id: "", product_id: "", qty: "1", note: "",
  });

  const companyId = profile?.company_id;

  const fetchWarehouses = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase.from("warehouses").select("*").eq("company_id", companyId).order("is_default", { ascending: false });
    setWarehouses((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchWarehouses();
    if (companyId) {
      supabase.from("products").select("id, name, sku, stock_qty").eq("company_id", companyId).then(({ data }) => setProducts(data || []));
    }
  }, [companyId]);

  const handleAdd = async () => {
    if (!companyId || !form.name.trim()) { toast.error("Warehouse name is required"); return; }
    setSaving(true);
    const { error } = await supabase.from("warehouses").insert({
      company_id: companyId, name: form.name.trim(), address: form.address.trim() || null,
      is_default: warehouses.length === 0,
    } as any);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Warehouse added"); setShowAdd(false); setForm({ name: "", address: "" }); fetchWarehouses(); }
  };

  const handleDelete = async (id: string) => {
    const wh = warehouses.find(w => w.id === id);
    if (wh?.is_default) { toast.error("Cannot delete default warehouse"); return; }
    const { error } = await supabase.from("warehouses").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Warehouse deleted"); fetchWarehouses(); }
  };

  const handleTransfer = async () => {
    if (!companyId) return;
    const { from_warehouse_id, to_warehouse_id, product_id, qty, note } = transferForm;
    if (!from_warehouse_id || !to_warehouse_id || !product_id || !qty) {
      toast.error("Please fill all required fields"); return;
    }
    if (from_warehouse_id === to_warehouse_id) { toast.error("Source and destination must differ"); return; }
    setSaving(true);
    const { error } = await supabase.from("stock_transfers").insert({
      company_id: companyId, from_warehouse_id, to_warehouse_id, product_id,
      qty: parseInt(qty), status: "completed", note: note || null, created_by: profile?.id,
      completed_at: new Date().toISOString(),
    } as any);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Stock transfer recorded"); setShowTransfer(false); setTransferForm({ from_warehouse_id: "", to_warehouse_id: "", product_id: "", qty: "1", note: "" }); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Warehouse className="h-5 w-5 text-accent" /> Warehouses & Locations
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowTransfer(true)} disabled={warehouses.length < 2}>
            <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer Stock
          </Button>
          <Button size="sm" className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Warehouse
          </Button>
        </div>
      </div>

      {warehouses.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <MapPin className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p>No warehouses set up yet</p>
          <p className="text-sm mt-1">Add your first warehouse to enable multi-location tracking</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.map((wh) => (
                <TableRow key={wh.id}>
                  <TableCell className="font-medium">{wh.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">{wh.address || "—"}</TableCell>
                  <TableCell>
                    {wh.is_default ? <Badge className="bg-accent/10 text-accent border-0 text-[10px]">Default</Badge>
                      : <Badge variant="outline" className="text-[10px]">Active</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    {!wh.is_default && role === "owner" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(wh.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Warehouse Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Warehouse</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Main Warehouse" className="mt-1" /></div>
            <div><Label>Address (optional)</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 High Street" className="mt-1" /></div>
            <Button onClick={handleAdd} className="w-full bg-accent text-accent-foreground" disabled={saving}>
              {saving ? "Adding..." : "Add Warehouse"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Stock Dialog */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Transfer Stock Between Warehouses</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>From Warehouse</Label>
              <Select value={transferForm.from_warehouse_id} onValueChange={v => setTransferForm({ ...transferForm, from_warehouse_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>To Warehouse</Label>
              <Select value={transferForm.to_warehouse_id} onValueChange={v => setTransferForm({ ...transferForm, to_warehouse_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select destination" /></SelectTrigger>
                <SelectContent>{warehouses.filter(w => w.id !== transferForm.from_warehouse_id).map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Product</Label>
              <Select value={transferForm.product_id} onValueChange={v => setTransferForm({ ...transferForm, product_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.stock_qty})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Quantity</Label><Input type="number" min="1" value={transferForm.qty} onChange={e => setTransferForm({ ...transferForm, qty: e.target.value })} className="mt-1" /></div>
            <div><Label>Note (optional)</Label><Input value={transferForm.note} onChange={e => setTransferForm({ ...transferForm, note: e.target.value })} className="mt-1" /></div>
            <Button onClick={handleTransfer} className="w-full bg-accent text-accent-foreground" disabled={saving}>
              {saving ? "Transferring..." : "Transfer Stock"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
