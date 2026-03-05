import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Phone, MessageCircle, Truck, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const emptyForm = { name: "", phone: "", whatsapp: "", email: "", address: "" };

export default function Suppliers() {
  const { profile } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from("suppliers").select("*").eq("company_id", profile.company_id).order("created_at", { ascending: false }),
      supabase.from("products").select("id, supplier_id").eq("company_id", profile.company_id),
    ]);
    setSuppliers(s || []);
    setProducts(p || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile?.company_id]);

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (s: any) => {
    setEditingId(s.id);
    setForm({ name: s.name, phone: s.phone || "", whatsapp: s.whatsapp || "", email: s.email || "", address: s.address || "" });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!profile?.company_id) return;
    setSaving(true);
    const payload = {
      name: form.name,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      address: form.address || null,
    };

    const { error } = editingId
      ? await supabase.from("suppliers").update(payload).eq("id", editingId)
      : await supabase.from("suppliers").insert({ ...payload, company_id: profile.company_id });

    if (error) toast.error(error.message);
    else {
      toast.success(editingId ? "Supplier updated!" : "Supplier added!");
      setShowDialog(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Supplier deleted"); fetchData(); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Suppliers"
        subtitle={`${suppliers.length} suppliers`}
        actions={
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add Supplier
          </Button>
        }
      />

      {suppliers.length === 0 ? (
        <div className="zentra-card p-12 text-center text-muted-foreground">
          <Truck className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p>No suppliers yet. Add your first supplier!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {suppliers.map((supplier) => {
            const productCount = products.filter((p) => p.supplier_id === supplier.id).length;
            return (
              <div key={supplier.id} className="zentra-card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <Truck className="h-5 w-5 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground text-sm truncate">{supplier.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{supplier.address || "No address"}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(supplier)}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(supplier.id)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Products</span>
                    <span className="font-medium text-foreground">{productCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Supply</span>
                    <span className="font-medium text-foreground">{supplier.last_supply_date || "—"}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs"
                    onClick={() => { if (supplier.phone) window.open(`tel:${supplier.phone}`); }}>
                    <Phone className="h-3 w-3" /> Call
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs text-success border-success/20 hover:bg-success/5"
                    onClick={() => {
                      const num = supplier.whatsapp || supplier.phone;
                      if (num) window.open(`https://wa.me/${num.replace(/[^0-9]/g, "")}`);
                    }}>
                    <MessageCircle className="h-3 w-3" /> WhatsApp
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Supplier name" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+44..." className="mt-1" /></div>
              <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+44..." className="mt-1" /></div>
            </div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="mt-1" /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" className="mt-1" /></div>
            <Button onClick={handleSave} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Supplier" : "Add Supplier"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
