import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Users, AlertTriangle, Clock, Phone, MessageCircle, Plus, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Currency } from "@/lib/types";

export default function CreditLedger() {
  const { profile, company } = useAuth();
  const currency = (company?.currency || "GBP") as Currency;
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDebtor, setShowAddDebtor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", whatsapp: "", email: "", address: "", notes: "", outstanding: "" });

  const fetchData = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const [{ data: custs }, { data: invs }] = await Promise.all([
      supabase.from("customers").select("*").eq("company_id", profile.company_id),
      supabase.from("invoices").select("*").eq("company_id", profile.company_id),
    ]);
    setCustomers(custs || []);
    setInvoices(invs || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile?.company_id]);

  const creditCustomers = customers
    .filter((c) => c.outstanding_balance > 0)
    .sort((a, b) => b.outstanding_balance - a.outstanding_balance);

  const totalOutstanding = creditCustomers.reduce((s, c) => s + c.outstanding_balance, 0);
  const overdueInvoices = invoices.filter((i) => i.status === "overdue");
  const totalOverdue = overdueInvoices.reduce((s, i) => s + (i.total - i.amount_paid), 0);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const customerInvoices = invoices
    .filter((i) => i.customer_id === selectedCustomerId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleAddDebtor = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!profile?.company_id) return;
    setSaving(true);
    const balance = Math.round(parseFloat(form.outstanding || "0") * 100);

    const { error } = await supabase.from("customers").insert({
      company_id: profile.company_id,
      name: form.name,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      address: form.address || null,
      notes: form.notes || null,
      outstanding_balance: balance,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Debtor added!");
      setShowAddDebtor(false);
      setForm({ name: "", phone: "", whatsapp: "", email: "", address: "", notes: "", outstanding: "" });
      fetchData();
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Credit Ledger"
        subtitle="Track who owes money, how much, and when it's due"
        actions={
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2" onClick={() => setShowAddDebtor(true)}>
            <Plus className="h-4 w-4" /> Add Debtor
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="zentra-card p-4 border-destructive/20">
          <p className="text-xs text-muted-foreground font-medium">Total Outstanding</p>
          <p className="text-2xl font-display font-bold text-destructive mt-1">{formatMoney(totalOutstanding, currency)}</p>
        </div>
        <div className="zentra-card p-4 border-warning/20">
          <p className="text-xs text-muted-foreground font-medium">Overdue Amount</p>
          <p className="text-2xl font-display font-bold text-warning mt-1">{formatMoney(totalOverdue, currency)}</p>
        </div>
        <div className="zentra-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Debtors</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{creditCustomers.length}</p>
        </div>
        <div className="zentra-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Overdue Invoices</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{overdueInvoices.length}</p>
        </div>
      </div>

      {/* Debtors Table */}
      <div className="zentra-card overflow-hidden mb-6">
        <div className="p-4 border-b">
          <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" /> Who Owes Money
          </h3>
        </div>
        {creditCustomers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>No debtors yet</p>
            <p className="text-sm mt-1">Add a debtor to start tracking credit</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditCustomers.map((customer) => (
                <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedCustomerId(customer.id)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{customer.name}</p>
                        {customer.notes && <p className="text-xs text-muted-foreground">{customer.notes}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{customer.phone || "—"}</TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-bold text-destructive">{formatMoney(customer.outstanding_balance, currency)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (customer.phone) window.open(`tel:${customer.phone}`); }}>
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => {
                        const num = customer.whatsapp || customer.phone;
                        if (num) {
                          const msg = encodeURIComponent(`Hi ${customer.name}, friendly reminder about your outstanding balance of ${formatMoney(customer.outstanding_balance, currency)}. Please arrange payment. Thank you!`);
                          window.open(`https://wa.me/${num.replace(/[^0-9]/g, "")}?text=${msg}`);
                        }
                      }}>
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Debtor Dialog */}
      <Dialog open={showAddDebtor} onOpenChange={setShowAddDebtor}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Debtor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer name" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+44..." className="mt-1" />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+44..." className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="mt-1" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" className="mt-1" />
            </div>
            <div>
              <Label>Outstanding Balance</Label>
              <Input type="number" step="0.01" value={form.outstanding} onChange={(e) => setForm({ ...form, outstanding: e.target.value })} placeholder="Amount owed" className="mt-1" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" className="mt-1" />
            </div>
            <Button onClick={handleAddDebtor} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving}>
              {saving ? "Saving..." : "Add Debtor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomerId} onOpenChange={() => setSelectedCustomerId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              {selectedCustomer?.name} — Credit History
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4 py-2">
              <div className="flex justify-between items-center p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                <span className="text-sm text-muted-foreground">Outstanding Balance</span>
                <span className="text-lg font-bold text-destructive">{formatMoney(selectedCustomer.outstanding_balance, currency)}</span>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Invoice History</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {customerInvoices.map((inv) => {
                    const balance = inv.total - inv.amount_paid;
                    const paidPct = inv.total > 0 ? (inv.amount_paid / inv.total) * 100 : 0;
                    return (
                      <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="text-sm font-medium text-foreground">{inv.invoice_number}</p>
                          <p className="text-xs text-muted-foreground">Due: {inv.due_date}</p>
                          <Progress value={paidPct} className="h-1 w-24 mt-1 [&>div]:bg-success" />
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">{formatMoney(inv.total, currency)}</p>
                          <StatusBadge status={inv.status} />
                          {balance > 0 && <p className="text-xs text-destructive mt-0.5">Owes: {formatMoney(balance, currency)}</p>}
                        </div>
                      </div>
                    );
                  })}
                  {customerInvoices.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No invoices found</p>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
