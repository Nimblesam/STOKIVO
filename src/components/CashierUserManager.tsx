import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, Users } from "lucide-react";

interface CashierUser {
  id: string;
  name: string;
  pin: string;
  role: string;
  active: boolean;
  store_id: string | null;
  created_at: string;
}

interface Store {
  id: string;
  name: string;
}

export function CashierUserManager() {
  const { profile } = useAuth();
  const [cashiers, setCashiers] = useState<CashierUser[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CashierUser | null>(null);
  const [form, setForm] = useState({ name: "", pin: "", role: "staff", store_id: "" });
  const [saving, setSaving] = useState(false);
  const [showPin, setShowPin] = useState<Record<string, boolean>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadData = async () => {
    if (!profile?.company_id) return;
    const [cashierRes, storeRes] = await Promise.all([
      supabase
        .from("cashier_users")
        .select("id, name, pin, role, active, store_id, created_at")
        .eq("company_id", profile.company_id)
        .order("name"),
      supabase
        .from("stores")
        .select("id, name")
        .eq("company_id", profile.company_id)
        .order("name"),
    ]);
    setCashiers(cashierRes.data || []);
    setStores(storeRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [profile?.company_id]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", pin: "", role: "staff", store_id: "" });
    setDialogOpen(true);
  };

  const openEdit = (c: CashierUser) => {
    setEditing(c);
    setForm({ name: c.name, pin: c.pin, role: c.role, store_id: c.store_id || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!/^\d{4}$/.test(form.pin)) { toast.error("PIN must be exactly 4 digits"); return; }
    if (!form.store_id) { toast.error("Please assign a store"); return; }
    if (!profile?.company_id) return;

    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("cashier_users")
          .update({
            name: form.name.trim(),
            pin: form.pin,
            role: form.role,
            store_id: form.store_id || null,
          })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Cashier user updated");
      } else {
        // Check for duplicate PIN in same company
        const existing = cashiers.find((c) => c.pin === form.pin && c.active);
        if (existing) {
          toast.error(`PIN already in use by ${existing.name}`);
          setSaving(false);
          return;
        }
        const { error } = await supabase.from("cashier_users").insert({
          company_id: profile.company_id,
          name: form.name.trim(),
          pin: form.pin,
          role: form.role,
          store_id: form.store_id || null,
        });
        if (error) throw error;
        toast.success("Cashier user added");
      }
      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("cashier_users").update({ active }).eq("id", id);
    if (error) toast.error(error.message);
    else loadData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("cashier_users").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Cashier user deleted");
      setDeleteConfirm(null);
      loadData();
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading cashier users...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Cashier Users
          </h3>
          <p className="text-sm text-muted-foreground">Manage staff who access the POS with a 4-digit PIN</p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Cashier
        </Button>
      </div>

      {cashiers.length === 0 ? (
        <div className="border border-dashed rounded-lg p-8 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-foreground">No cashier users yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Add staff members who will use the POS terminal</p>
          <Button onClick={openAdd} size="sm" variant="outline" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add First Cashier
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>PIN</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashiers.map((c) => {
                const store = stores.find((s) => s.id === c.store_id);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant={c.role === "manager" ? "default" : "secondary"} className="capitalize text-xs">
                        {c.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => setShowPin((p) => ({ ...p, [c.id]: !p[c.id] }))}
                        className="flex items-center gap-1.5 text-sm font-mono"
                      >
                        {showPin[c.id] ? c.pin : "••••"}
                        {showPin[c.id] ? (
                          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {store?.name || "All stores"}
                    </TableCell>
                    <TableCell>
                      <Switch checked={c.active} onCheckedChange={(v) => toggleActive(c.id, v)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {deleteConfirm === c.id ? (
                          <div className="flex items-center gap-1">
                            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => handleDelete(c.id)}>
                              Confirm
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDeleteConfirm(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(c.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Cashier User" : "Add Cashier User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="cashier-name">Full Name *</Label>
              <Input
                id="cashier-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. John Smith"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="cashier-pin">4-Digit PIN *</Label>
              <Input
                id="cashier-pin"
                value={form.pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setForm({ ...form, pin: val });
                }}
                placeholder="0000"
                className="mt-1 font-mono text-center text-lg tracking-[0.5em]"
                maxLength={4}
                inputMode="numeric"
              />
              <p className="text-xs text-muted-foreground mt-1">Used to sign in to the POS terminal</p>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assigned Store *</Label>
              <Select value={form.store_id} onValueChange={(v) => setForm({ ...form, store_id: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Each cashier must be assigned to a specific store</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Cashier"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}