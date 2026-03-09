import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/currency";
import { validateEmail, validateAddress } from "@/lib/validation";
import { FieldError } from "@/components/FieldError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Phone, MessageCircle, Truck, Loader2, MoreVertical, Pencil, Trash2, RefreshCw, Package } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Currency } from "@/lib/types";

const emptyForm = { name: "", phone: "", whatsapp: "", email: "", address: "" };

export default function Suppliers() {
  const { profile, company } = useAuth();
  const currency = (company?.currency || "GBP") as Currency;
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showProducts, setShowProducts] = useState<string | null>(null);
  
  // Reorder dialog state
  const [reorderSupplier, setReorderSupplier] = useState<any | null>(null);
  const [reorderItems, setReorderItems] = useState<any[]>([]);
  const [customOrderText, setCustomOrderText] = useState("");
  const [orderMode, setOrderMode] = useState<string>("checkboxes");

  const fetchData = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const [{ data: s }, { data: p }, { data: si }] = await Promise.all([
      supabase.from("suppliers").select("*").eq("company_id", profile.company_id).order("created_at", { ascending: false }),
      supabase.from("products").select("*").eq("company_id", profile.company_id),
      supabase.from("sale_items").select("product_id, qty"),
    ]);
    setSuppliers(s || []);
    setProducts(p || []);
    setSaleItems(si || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile?.company_id]);

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (s: any) => {
    setEditingId(s.id);
    setForm({ name: s.name, phone: s.phone || "", whatsapp: s.whatsapp || "", email: s.email || "", address: s.address || "" });
    setShowDialog(true);
  };

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const emailErr = validateEmail(form.email);
    const addrErr = validateAddress(form.address);
    setFieldErrors({ email: emailErr, address: addrErr });
    if (emailErr || addrErr) { toast.error("Please fix validation errors"); return; }
    if (!profile?.company_id) return;
    setSaving(true);
    const payload = { name: form.name, phone: form.phone || null, whatsapp: form.whatsapp || null, email: form.email || null, address: form.address || null };
    const { error } = editingId
      ? await supabase.from("suppliers").update(payload).eq("id", editingId)
      : await supabase.from("suppliers").insert({ ...payload, company_id: profile.company_id });
    if (error) toast.error(error.message);
    else { toast.success(editingId ? "Supplier updated!" : "Supplier added!"); setShowDialog(false); fetchData(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Supplier deleted"); fetchData(); }
  };

  const getSupplierProducts = (supplierId: string) => {
    return products.filter(p => p.supplier_id === supplierId);
  };

  const handleReorder = (supplier: any) => {
    const supplierProducts = getSupplierProducts(supplier.id);
    if (supplierProducts.length === 0) { toast.error("No products linked to this supplier"); return; }

    const num = supplier.whatsapp || supplier.phone;
    if (!num) { toast.error("Supplier has no phone/WhatsApp number"); return; }

    // Initialize items with suggested quantities based on min stock
    const items = supplierProducts.map(p => {
      const isLow = p.stock_qty <= p.min_stock_level;
      const suggestedQty = isLow ? Math.max(p.min_stock_level * 2 - p.stock_qty, p.min_stock_level) : 0;
      return {
        id: p.id,
        name: p.name,
        unit_type: p.unit_type,
        stock_qty: p.stock_qty,
        min_stock_level: p.min_stock_level,
        selected: isLow,
        qty: suggestedQty > 0 ? suggestedQty : (p.min_stock_level || 10)
      };
    });

    setReorderItems(items);
    
    // Auto-generate text for the text area based on default selected items
    const selectedText = items.filter(i => i.selected)
      .map(i => `- ${i.name}: ${i.qty} ${i.unit_type}s`)
      .join("\n");
    setCustomOrderText(`Hi ${supplier.name},\n\nI'd like to place a reorder:\n\n${selectedText || "[List your items here]"}\n\nPlease confirm availability and pricing.\n\nThank you!`);
    
    setOrderMode("checkboxes");
    setReorderSupplier(supplier);
  };

  const sendOrder = () => {
    if (!reorderSupplier) return;
    const num = reorderSupplier.whatsapp || reorderSupplier.phone;
    if (!num) return;

    let msg = "";
    if (orderMode === "checkboxes") {
      const selectedItems = reorderItems.filter(i => i.selected);
      if (selectedItems.length === 0) {
        toast.error("Please select at least one item to order");
        return;
      }
      const itemsList = selectedItems.map(i => `- ${i.name}: ${i.qty} ${i.unit_type}s`).join("\n");
      msg = `Hi ${reorderSupplier.name},\n\nI'd like to place a reorder:\n\n${itemsList}\n\nPlease confirm availability and pricing.\n\nThank you!`;
    } else {
      if (!customOrderText.trim()) {
        toast.error("Please enter your order details");
        return;
      }
      msg = customOrderText;
    }

    window.open(`https://wa.me/${num.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(msg)}`);
    toast.success("Reorder message opened in WhatsApp");
    setReorderSupplier(null);
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {suppliers.map((supplier) => {
            const supplierProducts = getSupplierProducts(supplier.id);
            const lowStockCount = supplierProducts.filter(p => p.stock_qty <= p.min_stock_level).length;
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
                      <DropdownMenuItem onClick={() => setShowProducts(supplier.id)}><Package className="h-3.5 w-3.5 mr-2" /> View Products</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(supplier.id)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Products</span>
                    <span className="font-medium text-foreground">{supplierProducts.length}</span>
                  </div>
                  {lowStockCount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Low Stock</span>
                      <span className="font-medium text-destructive">{lowStockCount}</span>
                    </div>
                  )}
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
                  <Button size="sm" className="flex-1 gap-1.5 text-xs bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => handleReorder(supplier)}>
                    <RefreshCw className="h-3 w-3" /> Re-order
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Supplier Products Dialog */}
      <Dialog open={!!showProducts} onOpenChange={() => setShowProducts(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Supplier Products</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                onChange={async (e) => {
                  if (!e.target.value) return;
                  const pid = e.target.value;
                  const { error } = await supabase.from("products").update({ supplier_id: showProducts }).eq("id", pid);
                  if (error) {
                    toast.error("Failed to link product");
                  } else {
                    toast.success("Product linked to supplier");
                    fetchData();
                  }
                  e.target.value = "";
                }}
              >
                <option value="">+ Add a product to this supplier...</option>
                {products.filter(p => p.supplier_id !== showProducts).map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {showProducts && getSupplierProducts(showProducts).map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 group">
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.sku} • {p.stock_qty} in stock</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatMoney(p.selling_price, currency)}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={async () => {
                        const { error } = await supabase.from("products").update({ supplier_id: null }).eq("id", p.id);
                        if (error) toast.error("Failed to unlink product");
                        else {
                          toast.success("Product unlinked");
                          fetchData();
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {showProducts && getSupplierProducts(showProducts).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No products linked to this supplier. Assign products above.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Supplier name" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+44..." className="mt-1" /></div>
              <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+44..." className="mt-1" /></div>
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setFieldErrors(f => ({ ...f, email: null })); }} placeholder="email@example.com" className={`mt-1 ${fieldErrors.email ? "border-destructive" : ""}`} />
              <FieldError message={fieldErrors.email} />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => { setForm({ ...form, address: e.target.value }); setFieldErrors(f => ({ ...f, address: null })); }} placeholder="Address" className={`mt-1 ${fieldErrors.address ? "border-destructive" : ""}`} maxLength={500} />
              <FieldError message={fieldErrors.address} />
            </div>
            <Button onClick={handleSave} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Supplier" : "Add Supplier"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reorder Dialog */}
      <Dialog open={!!reorderSupplier} onOpenChange={() => setReorderSupplier(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Re-order from {reorderSupplier?.name}</DialogTitle>
          </DialogHeader>
          
          <Tabs value={orderMode} onValueChange={setOrderMode} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="checkboxes">Select Products</TabsTrigger>
              <TabsTrigger value="custom">Custom Message</TabsTrigger>
            </TabsList>
            
            <TabsContent value="checkboxes" className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-2">
              {reorderItems.length > 0 ? (
                <div className="space-y-3">
                  {reorderItems.map((item, idx) => (
                    <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border ${item.selected ? 'bg-accent/5 border-accent/20' : 'bg-card'}`}>
                      <Checkbox 
                        id={`item-${item.id}`} 
                        checked={item.selected}
                        onCheckedChange={(checked) => {
                          const newItems = [...reorderItems];
                          newItems[idx].selected = !!checked;
                          setReorderItems(newItems);
                          
                          // Update custom text area too
                          const selectedText = newItems.filter(i => i.selected)
                            .map(i => `- ${i.name}: ${i.qty} ${i.unit_type}s`)
                            .join("\n");
                          setCustomOrderText(`Hi ${reorderSupplier?.name},\n\nI'd like to place a reorder:\n\n${selectedText || "[List your items here]"}\n\nPlease confirm availability and pricing.\n\nThank you!`);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor={`item-${item.id}`} className="font-medium cursor-pointer truncate block">
                          {item.name}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Stock: {item.stock_qty} (Min: {item.min_stock_level})
                        </p>
                      </div>
                      <div className="w-24 shrink-0 flex items-center gap-2">
                        <Input 
                          type="number" 
                          min="1"
                          value={item.qty}
                          onChange={(e) => {
                            const newItems = [...reorderItems];
                            newItems[idx].qty = parseInt(e.target.value) || 0;
                            // Auto-select if they change qty > 0
                            if (newItems[idx].qty > 0 && !newItems[idx].selected) {
                              newItems[idx].selected = true;
                            }
                            setReorderItems(newItems);
                            
                            // Update custom text area too
                            const selectedText = newItems.filter(i => i.selected)
                              .map(i => `- ${i.name}: ${i.qty} ${i.unit_type}s`)
                              .join("\n");
                            setCustomOrderText(`Hi ${reorderSupplier?.name},\n\nI'd like to place a reorder:\n\n${selectedText || "[List your items here]"}\n\nPlease confirm availability and pricing.\n\nThank you!`);
                          }}
                          className="h-8"
                          disabled={!item.selected}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-3 opacity-40" />
                  <p>No products are linked to this supplier.</p>
                  <Button variant="link" onClick={() => { setReorderSupplier(null); setShowProducts(reorderSupplier?.id); }}>
                    Link products from inventory
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="custom" className="flex-1 flex flex-col min-h-0">
              <Textarea 
                value={customOrderText}
                onChange={(e) => setCustomOrderText(e.target.value)}
                className="flex-1 min-h-[300px] resize-none font-mono text-sm"
                placeholder="Type your complete order list here..."
              />
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-6 pt-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setReorderSupplier(null)}>Cancel</Button>
            <Button onClick={sendOrder} className="bg-[#25D366] hover:bg-[#25D366]/90 text-white gap-2">
              <MessageCircle className="h-4 w-4" /> Send on WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}