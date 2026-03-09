import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/currency";
import { validateEmail, validateAddress } from "@/lib/validation";
import { FieldError } from "@/components/FieldError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Phone, MessageCircle, Users, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Currency } from "@/lib/types";

const emptyForm = { name: "", phone: "", whatsapp: "", email: "", address: "", notes: "" };

export default function Customers() {
  const { profile, company } = useAuth();
  const currency = (company?.currency || "GBP") as Currency;
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchCustomers = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const { data } = await supabase.from("customers").select("*").eq("company_id", profile.company_id).order("created_at", { ascending: false });
    setCustomers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, [profile?.company_id]);

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({ name: c.name, phone: c.phone || "", whatsapp: c.whatsapp || "", email: c.email || "", address: c.address || "", notes: c.notes || "" });
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
      notes: form.notes || null,
    };

    const { error } = editingId
      ? await supabase.from("customers").update(payload).eq("id", editingId)
      : await supabase.from("customers").insert({ ...payload, company_id: profile.company_id });

    if (error) toast.error(error.message);
    else {
      toast.success(editingId ? "Customer updated!" : "Customer added!");
      setShowDialog(false);
      fetchCustomers();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Customer deleted"); fetchCustomers(); }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customers`}
        actions={
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add Customer
          </Button>
        }
      />

      <div className="zentra-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>No customers yet. Add your first customer!</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{customer.name}</p>
                        {customer.email && <p className="text-xs text-muted-foreground">{customer.email}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{customer.phone || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{customer.address || "—"}</TableCell>
                  <TableCell className="text-right">
                    <span className={`text-sm font-semibold ${customer.outstanding_balance > 0 ? "text-destructive" : "text-success"}`}>
                      {formatMoney(customer.outstanding_balance, currency)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (customer.phone) window.open(`tel:${customer.phone}`); }}>
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => {
                        const num = customer.whatsapp || customer.phone;
                        if (num) window.open(`https://wa.me/${num.replace(/[^0-9]/g, "")}`);
                      }}>
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-3.5 w-3.5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(customer)}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(customer.id)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer name" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+44..." className="mt-1" /></div>
              <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+44..." className="mt-1" /></div>
            </div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="mt-1" /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" className="mt-1" /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" className="mt-1" /></div>
            <Button onClick={handleSave} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Customer" : "Add Customer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
