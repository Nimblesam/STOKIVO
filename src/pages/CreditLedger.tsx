import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/currency";
import { validateEmail, validateAddress } from "@/lib/validation";
import { FieldError } from "@/components/FieldError";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Users, AlertTriangle, Clock, Phone, Plus, Loader2, FileText, Send, CheckCircle, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Currency } from "@/lib/types";

export default function CreditLedger() {
  const { profile, company } = useAuth();
  const { activeStoreId } = useStore();
  const currency = (company?.currency || "GBP") as Currency;
  const [customers, setCustomers] = useState<any[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDebtor, setShowAddDebtor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [debtorMode, setDebtorMode] = useState<"existing" | "new">("existing");
  const [selectedExistingCustomer, setSelectedExistingCustomer] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", whatsapp: "", email: "", address: "", notes: "", outstanding: "", alert_date: "" });

  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [invoiceCustomerId, setInvoiceCustomerId] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [newInv, setNewInv] = useState({ due_date: "", items: [{ product_id: "", qty: "1" }] });
  const [savingInvoice, setSavingInvoice] = useState(false);

  const fetchData = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const [{ data: custs }, { data: invs }, { data: prods }] = await Promise.all([
      supabase.from("customers").select("*").eq("company_id", profile.company_id),
      supabase.from("invoices").select("*, customers(name, phone, whatsapp, email)").eq("company_id", profile.company_id),
      supabase.from("products").select("id, name, selling_price").eq("company_id", profile.company_id),
    ]);
    setAllCustomers(custs || []);
    setCustomers(custs || []);
    setInvoices(invs || []);
    setProducts(prods || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile?.company_id]);

  const unpaidInvoices = invoices.filter((i) => i.status !== "paid" && i.total > i.amount_paid);
  const unpaidCustomerIds = new Set(unpaidInvoices.map((i) => i.customer_id));

  const creditCustomers = customers
    .filter((c) => c.outstanding_balance > 0 || unpaidCustomerIds.has(c.id))
    .map((c) => {
      const custInvoiceDebt = unpaidInvoices
        .filter((i) => i.customer_id === c.id)
        .reduce((s, i) => s + (i.total - i.amount_paid), 0);
      return { ...c, total_debt: Math.max(c.outstanding_balance, custInvoiceDebt) };
    })
    .sort((a, b) => b.total_debt - a.total_debt);

  const totalOutstanding = creditCustomers.reduce((s, c) => s + c.total_debt, 0);
  const overdueInvoices = invoices.filter((i) => i.status === "overdue");
  const totalOverdue = overdueInvoices.reduce((s, i) => s + (i.total - i.amount_paid), 0);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const customerInvoices = invoices
    .filter((i) => i.customer_id === selectedCustomerId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Check if customer has any unpaid debt
  const getCustomerPaidStatus = (customer: any) => {
    const custUnpaid = unpaidInvoices.filter((i) => i.customer_id === customer.id);
    return customer.outstanding_balance <= 0 && custUnpaid.length === 0;
  };

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  const handleAddDebtor = async () => {
    if (!profile?.company_id) return;
    setSaving(true);
    if (debtorMode === "existing" && selectedExistingCustomer) {
      const balance = Math.round(parseFloat(form.outstanding || "0") * 100);
      const { error } = await supabase.from("customers").update({
        outstanding_balance: balance, notes: form.notes || null,
      }).eq("id", selectedExistingCustomer);
      if (error) toast.error(error.message);
      else { toast.success("Debtor updated!"); setShowAddDebtor(false); fetchData(); }
    } else {
      if (!form.name.trim()) { toast.error("Name is required"); setSaving(false); return; }
      const emailErr = validateEmail(form.email);
      const addrErr = validateAddress(form.address);
      setFieldErrors({ email: emailErr, address: addrErr });
      if (emailErr || addrErr) { toast.error("Please fix validation errors"); setSaving(false); return; }
      const balance = Math.round(parseFloat(form.outstanding || "0") * 100);
      const { error } = await supabase.from("customers").insert({
        company_id: profile.company_id, name: form.name,
        phone: form.phone || null, whatsapp: form.whatsapp || null,
        email: form.email || null, address: form.address || null,
        notes: form.notes || null, outstanding_balance: balance,
      });
      if (error) toast.error(error.message);
      else { toast.success("Debtor added!"); setShowAddDebtor(false); fetchData(); }
    }
    setForm({ name: "", phone: "", whatsapp: "", email: "", address: "", notes: "", outstanding: "", alert_date: "" });
    setSelectedExistingCustomer(""); setDebtorMode("existing"); setSaving(false);
  };

  const sendPaymentReminder = (customer: any) => {
    if (!customer.email) { toast.error("Customer has no email address registered"); return; }
    const debt = customer.total_debt || customer.outstanding_balance;
    const subject = encodeURIComponent(`Payment Reminder from ${company?.name || "Us"}`);
    const body = encodeURIComponent(
      `Dear ${customer.name},\n\n` +
      `This is a friendly reminder that you have an outstanding balance of ${formatMoney(debt, currency)} with ${company?.name || "us"}.\n\n` +
      `Please arrange payment at your earliest convenience.\n\n` +
      `If you have already made this payment, please disregard this reminder.\n\n` +
      `Thank you for your business.\n\n` +
      `Kind regards,\n${company?.name || "The Team"}`
    );
    window.open(`mailto:${customer.email}?subject=${subject}&body=${body}`);
    toast.success("Payment reminder email opened");
  };

  const markAsPaid = async (customerId: string) => {
    // Mark all unpaid invoices as paid and reset outstanding balance
    const custInvoices = unpaidInvoices.filter((i) => i.customer_id === customerId);
    for (const inv of custInvoices) {
      await supabase.from("invoices").update({
        amount_paid: inv.total, status: "paid" as any,
      }).eq("id", inv.id);
    }
    await supabase.from("customers").update({ outstanding_balance: 0 }).eq("id", customerId);
    toast.success("Marked as paid!");
    fetchData();
  };

  const openCreateInvoice = (customerId: string) => {
    setInvoiceCustomerId(customerId);
    // Pre-populate with credit data
    const customer = customers.find(c => c.id === customerId);
    const debt = customer?.outstanding_balance || 0;
    setNewInv({ due_date: "", items: [{ product_id: "", qty: "1" }] });
    setShowCreateInvoice(true);
  };

  const handleCreateInvoice = async () => {
    if (!newInv.due_date || !invoiceCustomerId || !profile?.company_id) {
      toast.error("Due date is required"); return;
    }
    setSavingInvoice(true);
    const validItems = newInv.items.filter(i => i.product_id);
    const itemDetails = validItems.map(i => {
      const prod = products.find(p => p.id === i.product_id);
      const qty = parseInt(i.qty) || 1;
      return { product_id: i.product_id, product_name: prod?.name || "", qty, unit_price: prod?.selling_price || 0, total: qty * (prod?.selling_price || 0) };
    });

    // If no products selected, use outstanding balance as the total
    const customer = customers.find(c => c.id === invoiceCustomerId);
    const subtotal = itemDetails.length > 0
      ? itemDetails.reduce((s, i) => s + i.total, 0)
      : (customer?.outstanding_balance || 0);

    const invNum = `INV-${Date.now().toString(36).toUpperCase()}`;

    const { data: inv, error } = await supabase.from("invoices").insert({
      company_id: profile.company_id, customer_id: invoiceCustomerId,
      invoice_number: invNum, due_date: newInv.due_date,
      subtotal, total: subtotal, status: "sent" as any,
      store_id: activeStoreId || null,
    }).select("id").single();

    if (error || !inv) { toast.error(error?.message || "Failed"); setSavingInvoice(false); return; }
    if (itemDetails.length > 0) {
      await supabase.from("invoice_items").insert(itemDetails.map(i => ({ ...i, invoice_id: inv.id })));
    }

    // Send invoice email to customer
    if (customer?.email) {
      const subject = encodeURIComponent(`Invoice ${invNum} from ${company?.name || "Us"}`);
      const body = encodeURIComponent(
        `Dear ${customer.name},\n\n` +
        `Please find your invoice details below:\n\n` +
        `Invoice Number: ${invNum}\n` +
        `Amount Due: ${formatMoney(subtotal, currency)}\n` +
        `Due Date: ${newInv.due_date}\n\n` +
        `Please arrange payment at your earliest convenience.\n\n` +
        `Thank you for your business.\n\n` +
        `Kind regards,\n${company?.name || "The Team"}`
      );
      window.open(`mailto:${customer.email}?subject=${subject}&body=${body}`);
    }

    toast.success(`Invoice ${invNum} created and sent!`);
    setShowCreateInvoice(false);
    fetchData();
    setSavingInvoice(false);
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
        <div className="stokivo-card p-4 border-destructive/20">
          <p className="text-xs text-muted-foreground font-medium">Total Outstanding</p>
          <p className="text-2xl font-display font-bold text-destructive mt-1">{formatMoney(totalOutstanding, currency)}</p>
        </div>
        <div className="stokivo-card p-4 border-warning/20">
          <p className="text-xs text-muted-foreground font-medium">Overdue Amount</p>
          <p className="text-2xl font-display font-bold text-warning mt-1">{formatMoney(totalOverdue, currency)}</p>
        </div>
        <div className="stokivo-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Debtors</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{creditCustomers.length}</p>
        </div>
        <div className="stokivo-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Unpaid Invoices</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{unpaidInvoices.length}</p>
        </div>
      </div>

      {/* Debtors Table */}
      <div className="stokivo-card overflow-hidden mb-6">
        <div className="p-4 border-b">
          <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" /> Who Owes Money
          </h3>
        </div>
        {creditCustomers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>No debtors yet</p>
            <p className="text-sm mt-1">Unpaid invoices and Pay Later sales will automatically appear here</p>
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
                  <TableCell className="text-sm text-muted-foreground">{customer.email || customer.phone || "—"}</TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-bold text-destructive">{formatMoney(customer.total_debt, currency)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (customer.phone) window.open(`tel:${customer.phone}`); }}>
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => sendPaymentReminder(customer)}>
                        <Mail className="h-3 w-3" /> Send Payment Reminder
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-success" onClick={() => markAsPaid(customer.id)}>
                        <CheckCircle className="h-3 w-3" /> Paid
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-accent" onClick={() => openCreateInvoice(customer.id)} title="Create Invoice">
                        <FileText className="h-3.5 w-3.5" />
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
            <div className="flex gap-2">
              <Button variant={debtorMode === "existing" ? "default" : "outline"} size="sm" onClick={() => setDebtorMode("existing")}>Existing Customer</Button>
              <Button variant={debtorMode === "new" ? "default" : "outline"} size="sm" onClick={() => setDebtorMode("new")}>New Customer</Button>
            </div>
            {debtorMode === "existing" ? (
              <div>
                <Label>Select Customer *</Label>
                <select value={selectedExistingCustomer} onChange={(e) => setSelectedExistingCustomer(e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select a customer</option>
                  {allCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            ) : (
              <>
                <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer name" className="mt-1" /></div>
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
              </>
            )}
            <div><Label>Outstanding Balance</Label><Input type="number" step="0.01" value={form.outstanding} onChange={(e) => setForm({ ...form, outstanding: e.target.value })} placeholder="Amount owed" className="mt-1" /></div>
            <div><Label>Alert Date</Label><Input type="date" value={form.alert_date} onChange={(e) => setForm({ ...form, alert_date: e.target.value })} className="mt-1" /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" className="mt-1" /></div>
            <Button onClick={handleAddDebtor} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving}>
              {saving ? "Saving..." : "Add Debtor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Invoice for Debtor Dialog */}
      <Dialog open={showCreateInvoice} onOpenChange={setShowCreateInvoice}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Invoice for Debtor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Due Date *</Label>
              <Input type="date" value={newInv.due_date} onChange={(e) => setNewInv({ ...newInv, due_date: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Line Items (optional — leave empty to use outstanding balance)</Label>
              {newInv.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 mt-2">
                  <select value={item.product_id} onChange={(e) => {
                    const items = [...newInv.items];
                    items[idx] = { ...items[idx], product_id: e.target.value };
                    setNewInv({ ...newInv, items });
                  }} className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} — {formatMoney(p.selling_price, currency)}</option>)}
                  </select>
                  <Input type="number" className="w-20" value={item.qty} onChange={(e) => {
                    const items = [...newInv.items];
                    items[idx] = { ...items[idx], qty: e.target.value };
                    setNewInv({ ...newInv, items });
                  }} min="1" />
                </div>
              ))}
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setNewInv({ ...newInv, items: [...newInv.items, { product_id: "", qty: "1" }] })}>
                <Plus className="h-3 w-3 mr-1" /> Add Line
              </Button>
            </div>
            <Button onClick={handleCreateInvoice} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={savingInvoice}>
              {savingInvoice ? "Creating..." : "Create & Send Invoice"}
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
                <span className="text-lg font-bold text-destructive">{formatMoney(selectedCustomer.total_debt || selectedCustomer.outstanding_balance, currency)}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => sendPaymentReminder(selectedCustomer)}>
                  <Mail className="h-3 w-3" /> Send Payment Reminder
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-success" onClick={() => { markAsPaid(selectedCustomer.id); setSelectedCustomerId(null); }}>
                  <CheckCircle className="h-3 w-3" /> Mark Paid
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setSelectedCustomerId(null); openCreateInvoice(selectedCustomer.id); }}>
                  <FileText className="h-3 w-3" /> Create Invoice
                </Button>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Invoice History</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {customerInvoices.map((inv) => {
                    const balance = inv.total - inv.amount_paid;
                    const paidPct = inv.total > 0 ? (inv.amount_paid / inv.total) * 100 : 0;
                    const isPaid = inv.status === "paid";
                    return (
                      <div key={inv.id} className={`flex items-center justify-between p-3 rounded-lg ${isPaid ? "bg-success/5 border border-success/20" : "bg-muted/30"}`}>
                        <div>
                          <p className="text-sm font-medium text-foreground">{inv.invoice_number}</p>
                          <p className="text-xs text-muted-foreground">Due: {inv.due_date}</p>
                          <Progress value={paidPct} className="h-1 w-24 mt-1 [&>div]:bg-success" />
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">{formatMoney(inv.total, currency)}</p>
                          {isPaid ? (
                            <span className="text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded">PAID</span>
                          ) : (
                            <StatusBadge status={inv.status} />
                          )}
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