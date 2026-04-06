import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { syncCustomerBalance } from "@/lib/sync-balance";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/currency";
import type { InvoiceStatus } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { InvoiceTemplate } from "@/components/InvoiceTemplate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, FileText, Eye, Printer, Loader2, Trash2, Send, Mail, MessageCircle, Bell, CheckCircle, DollarSign } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Currency } from "@/lib/types";

const statusFilters = ["all", "draft", "sent", "paid", "partially_paid", "overdue"] as const;


interface InvoiceRow {
  id: string;
  invoice_number: string;
  customer_id: string;
  status: string;
  subtotal: number;
  total: number;
  amount_paid: number;
  due_date: string;
  created_at: string;
  customers?: { name: string; address: string | null; phone: string | null; email: string | null; whatsapp?: string | null } | null;
}


export default function Invoices() {
  const { profile, company } = useAuth();
  const { activeStoreId } = useStore();
  const currency = (company?.currency || "GBP") as Currency;
  const [filter, setFilter] = useState<string>("all");
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceRow | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const [newInv, setNewInv] = useState({ customer_id: "", due_date: "", items: [{ product_id: "", qty: "1" }] });

  const fetchData = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    let invsQ = supabase.from("invoices").select("*, customers(name, address, phone, email, whatsapp)").eq("company_id", profile.company_id).order("created_at", { ascending: false });
    let prodsQ = supabase.from("products").select("id, name, selling_price").eq("company_id", profile.company_id);
    let custsQ = supabase.from("customers").select("id, name").eq("company_id", profile.company_id);
    if (activeStoreId) {
      invsQ = invsQ.eq("store_id", activeStoreId);
      prodsQ = prodsQ.eq("store_id", activeStoreId);
      custsQ = custsQ.eq("store_id", activeStoreId);
    }
    const [{ data: invs }, { data: custs }, { data: prods }] = await Promise.all([invsQ, custsQ, prodsQ]);
    setInvoices((invs as any[]) || []);
    setCustomers(custs || []);
    setProducts(prods || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile?.company_id, activeStoreId]);

  const filtered = filter === "all" ? invoices : invoices.filter((i) => i.status === filter);

  const handleCreate = async () => {
    if (!newInv.customer_id || !newInv.due_date) { toast.error("Customer and due date are required"); return; }
    if (!profile?.company_id) return;
    setSaving(true);
    const validItems = newInv.items.filter(i => i.product_id);
    const itemDetails = validItems.map(i => {
      const prod = products.find(p => p.id === i.product_id);
      const qty = parseInt(i.qty) || 1;
      return { product_id: i.product_id, product_name: prod?.name || "", qty, unit_price: prod?.selling_price || 0, total: qty * (prod?.selling_price || 0) };
    });
    const subtotal = itemDetails.reduce((s, i) => s + i.total, 0);
    const invNum = `INV-${Date.now().toString(36).toUpperCase()}`;

    const { data: inv, error } = await supabase.from("invoices").insert({
      company_id: profile.company_id, customer_id: newInv.customer_id,
      invoice_number: invNum, due_date: newInv.due_date,
      subtotal, total: subtotal, status: "draft" as any,
      store_id: activeStoreId,
    }).select("id").single();

    if (error || !inv) { toast.error(error?.message || "Failed"); setSaving(false); return; }
    if (itemDetails.length > 0) {
      await supabase.from("invoice_items").insert(itemDetails.map(i => ({ ...i, invoice_id: inv.id })));
    }
    toast.success(`Invoice ${invNum} created!`);
    setShowCreate(false);
    setNewInv({ customer_id: "", due_date: "", items: [{ product_id: "", qty: "1" }] });
    fetchData();
    setSaving(false);
  };

  const viewInvoice = async (inv: InvoiceRow) => {
    setSelectedItems([]);
    const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id);
    setSelectedItems(data || []);
    setSelectedInvoice(inv);
  };

  const sendViaEmail = (inv: InvoiceRow) => {
    const cust = (inv as any).customers;
    if (!cust?.email) { toast.error("Customer has no email address"); return; }
    const subject = encodeURIComponent(`Invoice ${inv.invoice_number} from ${company?.name || "Us"}`);
    const body = encodeURIComponent(
      `Hi ${cust.name},\n\nPlease find your invoice ${inv.invoice_number} for ${formatMoney(inv.total, currency)}.\nDue date: ${inv.due_date}\nBalance: ${formatMoney(inv.total - inv.amount_paid, currency)}\n\nThank you!`
    );
    window.open(`mailto:${cust.email}?subject=${subject}&body=${body}`);
    if (inv.status === "draft") {
      supabase.from("invoices").update({ status: "sent" as any }).eq("id", inv.id).then(() => fetchData());
    }
    toast.success("Email client opened");
  };

  const sendReminder = async (inv: InvoiceRow) => {
    const cust = (inv as any).customers;
    if (!cust?.email) { toast.error("Customer has no email address registered"); return; }
    const balance = inv.total - inv.amount_paid;
    if (balance <= 0) { toast.info("This invoice is fully paid"); return; }
    const subject = encodeURIComponent(`Payment Reminder: Invoice ${inv.invoice_number}`);
    const body = encodeURIComponent(
      `Dear ${cust.name},\n\n` +
      `This is a friendly reminder that payment is due for the following invoice:\n\n` +
      `Invoice Number: ${inv.invoice_number}\n` +
      `Invoice Total: ${formatMoney(inv.total, currency)}\n` +
      `Amount Paid: ${formatMoney(inv.amount_paid, currency)}\n` +
      `Balance Due: ${formatMoney(balance, currency)}\n` +
      `Due Date: ${inv.due_date}\n\n` +
      `Please arrange payment at your earliest convenience.\n\n` +
      `Kind regards,\n${company?.name || "The Team"}`
    );
    window.open(`mailto:${cust.email}?subject=${subject}&body=${body}`);
    await supabase.from("reminder_logs").insert({ invoice_id: inv.id, channel: "email", note: `Payment reminder sent for balance ${formatMoney(balance, currency)}` });
    const now = new Date().toISOString().split("T")[0];
    if (inv.due_date < now && inv.status !== "overdue" && inv.status !== "paid") {
      await supabase.from("invoices").update({ status: "overdue" as any }).eq("id", inv.id);
    }
    toast.success("Payment reminder email opened");
    fetchData();
  };

  const sendViaWhatsApp = (inv: InvoiceRow) => {
    const cust = (inv as any).customers;
    const num = cust?.whatsapp || cust?.phone;
    if (!num) { toast.error("Customer has no phone/WhatsApp number"); return; }
    const msg = encodeURIComponent(
      `Hi ${cust.name}, here's your invoice ${inv.invoice_number}.\n\nTotal: ${formatMoney(inv.total, currency)}\nBalance due: ${formatMoney(inv.total - inv.amount_paid, currency)}\nDue date: ${inv.due_date}\n\nThank you!`
    );
    window.open(`https://wa.me/${num.replace(/[^0-9]/g, "")}?text=${msg}`);
    if (inv.status === "draft") {
      supabase.from("invoices").update({ status: "sent" as any }).eq("id", inv.id).then(() => fetchData());
    }
  };

  const openPaymentDialog = (inv: InvoiceRow) => {
    setPaymentInvoice(inv);
    setPaymentAmount("");
    setShowPaymentDialog(true);
  };

  const handleMarkPayment = async () => {
    if (!paymentInvoice) return;
    const amountMinor = Math.round(parseFloat(paymentAmount || "0") * 100);
    const balance = paymentInvoice.total - paymentInvoice.amount_paid;
    if (amountMinor <= 0 || amountMinor > balance) {
      toast.error(`Enter a valid amount between 0 and ${formatMoney(balance, currency)}`);
      return;
    }

    const newAmountPaid = paymentInvoice.amount_paid + amountMinor;
    const newStatus = newAmountPaid >= paymentInvoice.total ? "paid" : "partially_paid";

    await supabase.from("invoices").update({
      amount_paid: newAmountPaid, status: newStatus as any,
    }).eq("id", paymentInvoice.id);

    await supabase.from("payments").insert({
      invoice_id: paymentInvoice.id, amount: amountMinor, payment_method: "manual",
      note: `Manual payment of ${formatMoney(amountMinor, currency)}`,
    });

    // Update customer outstanding balance
    if (paymentInvoice.customer_id) {
      const { data: custData } = await supabase
        .from("customers").select("outstanding_balance").eq("id", paymentInvoice.customer_id).single();
      if (custData) {
        await supabase.from("customers").update({
          outstanding_balance: Math.max(0, custData.outstanding_balance - amountMinor),
        }).eq("id", paymentInvoice.customer_id);
      }
    }

    toast.success(newStatus === "paid" ? "Invoice marked as fully paid!" : "Partial payment recorded!");
    setShowPaymentDialog(false);
    fetchData();
  };

  const markFullyPaid = async (inv: InvoiceRow) => {
    const balance = inv.total - inv.amount_paid;
    await supabase.from("invoices").update({
      amount_paid: inv.total, status: "paid" as any,
    }).eq("id", inv.id);

    if (balance > 0) {
      await supabase.from("payments").insert({
        invoice_id: inv.id, amount: balance, payment_method: "manual",
        note: "Marked as fully paid",
      });
    }

    if (inv.customer_id) {
      const { data: custData } = await supabase
        .from("customers").select("outstanding_balance").eq("id", inv.customer_id).single();
      if (custData) {
        await supabase.from("customers").update({
          outstanding_balance: Math.max(0, custData.outstanding_balance - balance),
        }).eq("id", inv.customer_id);
      }
    }

    toast.success("Invoice marked as paid!");
    fetchData();
  };

  const [fullCompany, setFullCompany] = useState<any>(null);
  useEffect(() => {
    if (company?.id) {
      supabase.from("companies").select("*").eq("id", company.id).single().then(({ data }) => { if (data) setFullCompany(data); });
    }
  }, [company?.id]);

  const getInvoiceCompany = () => ({
    name: fullCompany?.name || company?.name || "",
    address: fullCompany?.address || null, phone: fullCompany?.phone || null,
    email: fullCompany?.email || null, company_number: fullCompany?.company_number || null,
    logo_url: fullCompany?.logo_url || null,
    currency: (fullCompany?.currency || company?.currency || "GBP") as any,
    brand_color: fullCompany?.brand_color || company?.brand_color || "#0d9488",
  });

  const handlePrintInvoice = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} invoices`}
        actions={
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {statusFilters.map((s) => (
          <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" className={filter === s ? "bg-primary text-primary-foreground" : ""} onClick={() => setFilter(s)}>
            {s === "all" ? "All" : s.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
          </Button>
        ))}
      </div>

      <div className="stokivo-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>No invoices yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => {
                const balance = inv.total - inv.amount_paid;
                return (
                  <TableRow key={inv.id}>
                    <TableCell><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span className="font-medium text-sm">{inv.invoice_number}</span></div></TableCell>
                    <TableCell className="text-sm">{(inv as any).customers?.name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{inv.due_date}</TableCell>
                    <TableCell>
                      {inv.status === "paid" ? (
                        <span className="text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded">PAID</span>
                      ) : (
                        <StatusBadge status={inv.status as InvoiceStatus} />
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatMoney(inv.total, currency)}</TableCell>
                    <TableCell className="text-right text-sm text-success">{formatMoney(inv.amount_paid, currency)}</TableCell>
                    <TableCell className="text-right"><span className={`text-sm font-semibold ${balance > 0 ? "text-destructive" : "text-success"}`}>{formatMoney(balance, currency)}</span></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewInvoice(inv)}><Eye className="h-3.5 w-3.5" /></Button>
                        {balance > 0 && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-warning" title="Send Payment Reminder" onClick={() => sendReminder(inv)}><Bell className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-success" title="Record Payment" onClick={() => openPaymentDialog(inv)}><DollarSign className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-accent" title="Mark Fully Paid" onClick={() => markFullyPaid(inv)}><CheckCircle className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-accent"><Send className="h-3.5 w-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => sendViaEmail(inv)}><Mail className="h-3.5 w-3.5 mr-2" /> Send to Email</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => sendViaWhatsApp(inv)}><MessageCircle className="h-3.5 w-3.5 mr-2" /> Send via WhatsApp</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Customer *</Label>
              <select value={newInv.customer_id} onChange={(e) => setNewInv({ ...newInv, customer_id: e.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><Label>Due Date *</Label><Input type="date" value={newInv.due_date} onChange={(e) => setNewInv({ ...newInv, due_date: e.target.value })} className="mt-1" /></div>
            <div>
              <Label>Line Items</Label>
              {newInv.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 mt-2">
                  <select value={item.product_id} onChange={(e) => {
                    const items = [...newInv.items]; items[idx] = { ...items[idx], product_id: e.target.value };
                    setNewInv({ ...newInv, items });
                  }} className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} — {formatMoney(p.selling_price, currency)}</option>)}
                  </select>
                  <Input type="number" className="w-20" value={item.qty} onChange={(e) => {
                    const items = [...newInv.items]; items[idx] = { ...items[idx], qty: e.target.value };
                    setNewInv({ ...newInv, items });
                  }} min="1" />
                  {newInv.items.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => setNewInv({ ...newInv, items: newInv.items.filter((_, i) => i !== idx) })}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setNewInv({ ...newInv, items: [...newInv.items, { product_id: "", qty: "1" }] })}>
                <Plus className="h-3 w-3 mr-1" /> Add Line
              </Button>
            </div>
            <Button onClick={handleCreate} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving}>
              {saving ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          {paymentInvoice && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span className="font-medium">{paymentInvoice.invoice_number}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span>{formatMoney(paymentInvoice.total, currency)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Already Paid</span><span className="text-success">{formatMoney(paymentInvoice.amount_paid, currency)}</span></div>
                <div className="flex justify-between font-semibold"><span>Balance Due</span><span className="text-destructive">{formatMoney(paymentInvoice.total - paymentInvoice.amount_paid, currency)}</span></div>
              </div>
              <div>
                <Label>Payment Amount</Label>
                <Input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={`Max: ${((paymentInvoice.total - paymentInvoice.amount_paid) / 100).toFixed(2)}`} className="mt-1" />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleMarkPayment}>Record Payment</Button>
                <Button variant="outline" className="flex-1" onClick={() => {
                  setPaymentAmount(((paymentInvoice.total - paymentInvoice.amount_paid) / 100).toFixed(2));
                }}>Pay Full Balance</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Preview */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="print:hidden">
           <DialogTitle className="flex items-center justify-between">
              <span>{selectedInvoice?.invoice_number}</span>
              <div className="flex gap-2">
                {selectedInvoice && (selectedInvoice.total - selectedInvoice.amount_paid) > 0 && (
                  <>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => selectedInvoice && sendReminder(selectedInvoice)}>
                      <Bell className="h-4 w-4" /> Send Reminder
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 text-success" onClick={() => { if (selectedInvoice) { openPaymentDialog(selectedInvoice); setSelectedInvoice(null); } }}>
                      <DollarSign className="h-4 w-4" /> Record Payment
                    </Button>
                  </>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2"><Send className="h-4 w-4" /> Send</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => selectedInvoice && sendViaEmail(selectedInvoice)}><Mail className="h-3.5 w-3.5 mr-2" /> Send to Email</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => selectedInvoice && sendViaWhatsApp(selectedInvoice)}><MessageCircle className="h-3.5 w-3.5 mr-2" /> Send via WhatsApp</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" className="gap-2" onClick={handlePrintInvoice}><Printer className="h-4 w-4" /> Print</Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <InvoiceTemplate
              company={getInvoiceCompany()}
              invoice={{
                invoiceNumber: selectedInvoice.invoice_number,
                status: selectedInvoice.status as any,
                createdAt: selectedInvoice.created_at.split("T")[0],
                dueDate: selectedInvoice.due_date,
                customerName: (selectedInvoice as any).customers?.name || "",
                customerAddress: (selectedInvoice as any).customers?.address,
                customerPhone: (selectedInvoice as any).customers?.phone,
                customerEmail: (selectedInvoice as any).customers?.email,
                items: selectedItems.map(it => ({ productName: it.product_name, qty: it.qty, unitPrice: it.unit_price, total: it.total })),
                subtotal: selectedInvoice.subtotal,
                total: selectedInvoice.total,
                amountPaid: selectedInvoice.amount_paid,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}