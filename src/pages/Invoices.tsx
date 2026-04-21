import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { syncCustomerBalance } from "@/lib/sync-balance";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/currency";
import { buildWhatsAppUrl } from "@/lib/phone";
import type { InvoiceStatus } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { InvoiceTemplate } from "@/components/InvoiceTemplate";
import { renderNodeToPdfBlob, uploadInvoicePdf } from "@/lib/invoice-pdf";
import { createRoot } from "react-dom/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, FileText, Eye, Printer, Loader2, Trash2, Send, Mail, MessageCircle, Bell, CheckCircle, DollarSign, ChevronLeft, ChevronRight, Download, Pencil, Save, X } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Currency } from "@/lib/types";
import { ProductLineItemPicker } from "@/components/ProductLineItemPicker";

const statusFilters = ["all", "draft", "sent", "paid", "partially_paid", "overdue"] as const;
const ITEMS_PER_PAGE = 10;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // editingId !== null when editing an existing draft.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newInv, setNewInv] = useState({ customer_id: "", due_date: "", items: [{ product_id: "", qty: "1" }] });

  const fetchData = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    let invsQ = supabase.from("invoices").select("*, customers(name, address, phone, email, whatsapp)").eq("company_id", profile.company_id).order("created_at", { ascending: false });
    let prodsQ = supabase.from("products").select("id, name, selling_price, sku").eq("company_id", profile.company_id);
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
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedInvoices = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page when filter changes
  useEffect(() => { setCurrentPage(1); }, [filter]);

  const resetForm = () => {
    setEditingId(null);
    setNewInv({ customer_id: "", due_date: "", items: [{ product_id: "", qty: "1" }] });
  };

  const openCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  const openEditDraft = async (inv: InvoiceRow) => {
    if (inv.status !== "draft") {
      toast.error("Only draft invoices can be edited");
      return;
    }
    const { data: items } = await supabase.from("invoice_items").select("product_id, qty").eq("invoice_id", inv.id);
    setEditingId(inv.id);
    setNewInv({
      customer_id: inv.customer_id,
      due_date: inv.due_date,
      items: (items && items.length > 0)
        ? items.map((i: any) => ({ product_id: i.product_id || "", qty: String(i.qty ?? 1) }))
        : [{ product_id: "", qty: "1" }],
    });
    setShowCreate(true);
  };

  /**
   * Persist the invoice. Used for both initial draft creation and edits.
   * Status is "draft" when saveAsDraft, otherwise preserves the existing status (or "draft" for new).
   */
  const persistInvoice = async (saveAsDraft: boolean) => {
    if (!newInv.customer_id || !newInv.due_date) { toast.error("Customer and due date are required"); return; }
    if (!profile?.company_id) return;
    setSaving(true);
    const validItems = newInv.items.filter(i => i.product_id);
    // Pull live name + price from products list at save time so line items always
    // reflect the current product catalogue.
    const itemDetails = validItems.map(i => {
      const prod = products.find(p => p.id === i.product_id);
      const qty = parseInt(i.qty) || 1;
      return {
        product_id: i.product_id,
        product_name: prod?.name || "",
        qty,
        unit_price: prod?.selling_price || 0,
        total: qty * (prod?.selling_price || 0),
      };
    });
    const subtotal = itemDetails.reduce((s, i) => s + i.total, 0);

    if (editingId) {
      // Update existing draft
      const { error: updErr } = await supabase.from("invoices").update({
        customer_id: newInv.customer_id,
        due_date: newInv.due_date,
        subtotal,
        total: subtotal,
        status: "draft" as any,
      }).eq("id", editingId);
      if (updErr) { toast.error(updErr.message); setSaving(false); return; }
      // Replace items
      await supabase.from("invoice_items").delete().eq("invoice_id", editingId);
      if (itemDetails.length > 0) {
        await supabase.from("invoice_items").insert(itemDetails.map(i => ({ ...i, invoice_id: editingId })));
      }
      toast.success("Draft updated");
    } else {
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
      toast.success(saveAsDraft ? `Draft ${invNum} saved` : `Invoice ${invNum} created!`);
    }

    setShowCreate(false);
    resetForm();
    fetchData();
    setSaving(false);
  };

  const handleCreate = () => persistInvoice(false);
  const handleSaveDraft = () => persistInvoice(true);

  const viewInvoice = async (inv: InvoiceRow) => {
    setSelectedItems([]);
    const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id);
    setSelectedItems(data || []);
    setSelectedInvoice(inv);
  };

  const handleDeleteInvoice = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Delete child rows first (in case FKs aren't cascading)
      await supabase.from("invoice_items").delete().eq("invoice_id", deleteTarget.id);
      await supabase.from("payments").delete().eq("invoice_id", deleteTarget.id);
      await supabase.from("reminder_logs").delete().eq("invoice_id", deleteTarget.id);
      const { error } = await supabase.from("invoices").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      // Recompute customer outstanding balance from ledger
      try { await syncCustomerBalance(deleteTarget.customer_id); } catch {}
      toast.success(`Invoice ${deleteTarget.invoice_number} deleted`);
      setDeleteTarget(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete invoice");
    } finally {
      setDeleting(false);
    }
  };

  /**
   * Render the invoice template offscreen, snapshot to PDF, and upload to storage.
   * Returns a public URL to the uploaded PDF.
   */
  const generateInvoicePdfUrl = async (inv: InvoiceRow): Promise<string> => {
    if (!profile?.company_id) throw new Error("Missing company");

    // Load items if not already loaded for this invoice
    let items = selectedInvoice?.id === inv.id ? selectedItems : [];
    if (items.length === 0) {
      const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id);
      items = data || [];
    }

    // Render InvoiceTemplate offscreen
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-10000px";
    host.style.top = "0";
    host.style.width = "800px";
    host.style.background = "#ffffff";
    document.body.appendChild(host);
    const root = createRoot(host);

    try {
      const cust = (inv as any).customers;
      root.render(
        <InvoiceTemplate
          company={getInvoiceCompany()}
          invoice={{
            invoiceNumber: inv.invoice_number,
            createdAt: inv.created_at,
            dueDate: inv.due_date,
            status: inv.status as any,
            subtotal: inv.subtotal,
            total: inv.total,
            amountPaid: inv.amount_paid,
            customerName: cust?.name || "—",
            customerAddress: cust?.address || undefined,
            customerPhone: cust?.phone || undefined,
            customerEmail: cust?.email || undefined,
            items: items.map((i: any) => ({
              productName: i.product_name,
              qty: i.qty,
              unitPrice: i.unit_price,
              total: i.total,
            })),
          }}
        />
      );
      // Wait for paint + any logo image load
      await new Promise((r) => setTimeout(r, 350));
      const blob = await renderNodeToPdfBlob(host.firstElementChild as HTMLElement);
      return await uploadInvoicePdf(blob, profile.company_id, inv.invoice_number);
    } finally {
      root.unmount();
      host.remove();
    }
  };

  /**
   * Render the invoice template offscreen and trigger a browser download
   * of the PDF (no Supabase upload). Saves directly to the merchant's computer.
   */
  const downloadInvoicePdf = async (inv: InvoiceRow) => {
    const t = toast.loading("Preparing invoice PDF...");
    // Load items if not already loaded for this invoice
    let items = selectedInvoice?.id === inv.id ? selectedItems : [];
    if (items.length === 0) {
      const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id);
      items = data || [];
    }

    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-10000px";
    host.style.top = "0";
    host.style.width = "800px";
    host.style.background = "#ffffff";
    document.body.appendChild(host);
    const root = createRoot(host);

    try {
      const cust = (inv as any).customers;
      root.render(
        <InvoiceTemplate
          company={getInvoiceCompany()}
          invoice={{
            invoiceNumber: inv.invoice_number,
            createdAt: inv.created_at,
            dueDate: inv.due_date,
            status: inv.status as any,
            subtotal: inv.subtotal,
            total: inv.total,
            amountPaid: inv.amount_paid,
            customerName: cust?.name || "—",
            customerAddress: cust?.address || undefined,
            customerPhone: cust?.phone || undefined,
            customerEmail: cust?.email || undefined,
            items: items.map((i: any) => ({
              productName: i.product_name,
              qty: i.qty,
              unitPrice: i.unit_price,
              total: i.total,
            })),
          }}
        />
      );
      await new Promise((r) => setTimeout(r, 350));
      const blob = await renderNodeToPdfBlob(host.firstElementChild as HTMLElement);
      const safeNumber = inv.invoice_number.replace(/[^a-zA-Z0-9_-]/g, "_");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.dismiss(t);
      toast.success(`Invoice ${inv.invoice_number} downloaded`);
    } catch (err: any) {
      toast.dismiss(t);
      toast.error(err?.message || "Failed to download invoice");
    } finally {
      root.unmount();
      host.remove();
    }
  };

  const sendViaEmail = async (inv: InvoiceRow) => {
    const cust = (inv as any).customers;
    if (!cust?.email) { toast.error("Customer has no email address"); return; }
    const mailWindow = window.open("", "_blank");
    const t = toast.loading("Generating invoice PDF...");
    try {
      const pdfUrl = await generateInvoicePdfUrl(inv);
      const subject = encodeURIComponent(`Invoice ${inv.invoice_number} from ${company?.name || "Us"}`);
      const body = encodeURIComponent(
        `Hi ${cust.name},\n\nPlease find your invoice ${inv.invoice_number} for ${formatMoney(inv.total, currency)}.\nDue date: ${inv.due_date}\nBalance: ${formatMoney(inv.total - inv.amount_paid, currency)}\n\nDownload PDF: ${pdfUrl}\n\nThank you!`
      );
      const mailto = `mailto:${cust.email}?subject=${subject}&body=${body}`;
      if (mailWindow) { mailWindow.location.href = mailto; } else { window.location.href = mailto; }
      if (inv.status === "draft") {
        await supabase.from("invoices").update({ status: "sent" as any }).eq("id", inv.id);
        fetchData();
      }
      toast.dismiss(t);
      toast.success("Invoice PDF attached to email");
    } catch (err: any) {
      toast.dismiss(t);
      mailWindow?.close();
      toast.error(err?.message || "Failed to attach PDF");
    }
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

  const sendViaWhatsApp = async (inv: InvoiceRow) => {
    const cust = (inv as any).customers;
    const num = cust?.whatsapp || cust?.phone;
    if (!num) { toast.error("Customer has no phone/WhatsApp number"); return; }
    // Open a placeholder tab first to avoid popup blocker after the await
    const waWindow = window.open("about:blank", "_blank");
    const t = toast.loading("Generating invoice PDF...");
    try {
      const pdfUrl = await generateInvoicePdfUrl(inv);
      const text = `Hi ${cust.name}, here's your invoice ${inv.invoice_number}.\n\nTotal: ${formatMoney(inv.total, currency)}\nBalance due: ${formatMoney(inv.total - inv.amount_paid, currency)}\nDue date: ${inv.due_date}\n\n📎 Download PDF: ${pdfUrl}\n\nThank you!`;
      const url = buildWhatsAppUrl(num, company?.country, text);
      if (!url) { waWindow?.close(); toast.dismiss(t); toast.error("Invalid phone number format"); return; }
      if (waWindow) { waWindow.location.href = url; } else { window.open(url, "_blank"); }
      if (inv.status === "draft") {
        await supabase.from("invoices").update({ status: "sent" as any }).eq("id", inv.id);
        fetchData();
      }
      toast.dismiss(t);
      toast.success("Invoice PDF attached to WhatsApp message");
    } catch (err: any) {
      toast.dismiss(t);
      waWindow?.close();
      toast.error(err?.message || "Failed to attach PDF");
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

    if (paymentInvoice.customer_id) {
      await syncCustomerBalance(paymentInvoice.customer_id);
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
      await syncCustomerBalance(inv.customer_id);
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
          <>
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
                {paginatedInvoices.map((inv) => {
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
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="View Invoice" onClick={() => viewInvoice(inv)}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Download PDF" onClick={() => downloadInvoicePdf(inv)}><Download className="h-3.5 w-3.5" /></Button>
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
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete Invoice" onClick={() => setDeleteTarget(inv)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button key={page} variant={page === currentPage ? "default" : "outline"} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(page)}>
                      {page}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
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
                  }} />
                </div>
              ))}
              <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setNewInv({ ...newInv, items: [...newInv.items, { product_id: "", qty: "1" }] })}>
                + Add Line
              </Button>
            </div>
            <Button onClick={handleCreate} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving}>
              {saving ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => { if (!open) setSelectedInvoice(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto print:max-w-none print:shadow-none">
          {selectedInvoice && (
            <div>
              <div className="flex gap-2 mb-4 print:hidden">
                <Button variant="outline" size="sm" onClick={() => sendViaEmail(selectedInvoice)}><Mail className="h-3.5 w-3.5 mr-1" /> Email</Button>
                <Button variant="outline" size="sm" onClick={() => sendViaWhatsApp(selectedInvoice)}><MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp</Button>
                <Button variant="outline" size="sm" onClick={() => downloadInvoicePdf(selectedInvoice)}><Download className="h-3.5 w-3.5 mr-1" /> Download PDF</Button>
                <Button variant="outline" size="sm" onClick={handlePrintInvoice}><Printer className="h-3.5 w-3.5 mr-1" /> Print</Button>
              </div>
              <InvoiceTemplate
                company={getInvoiceCompany()}
                invoice={{
                  invoiceNumber: selectedInvoice.invoice_number,
                  createdAt: selectedInvoice.created_at,
                  dueDate: selectedInvoice.due_date,
                  status: selectedInvoice.status as any,
                  subtotal: selectedInvoice.subtotal,
                  total: selectedInvoice.total,
                  amountPaid: selectedInvoice.amount_paid,
                  customerName: (selectedInvoice as any).customers?.name || "—",
                  customerAddress: (selectedInvoice as any).customers?.address || undefined,
                  customerPhone: (selectedInvoice as any).customers?.phone || undefined,
                  customerEmail: (selectedInvoice as any).customers?.email || undefined,
                  items: selectedItems.map((i: any) => ({
                    productName: i.product_name,
                    qty: i.qty,
                    unitPrice: i.unit_price,
                    total: i.total,
                  })),
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={(open) => { if (!open) setShowPaymentDialog(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          {paymentInvoice && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Balance Due</p>
                <p className="text-2xl font-bold text-destructive">{formatMoney(paymentInvoice.total - paymentInvoice.amount_paid, currency)}</p>
              </div>
              <div>
                <Label>Payment Amount</Label>
                <Input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" className="mt-1" autoFocus />
              </div>
              <Button onClick={handleMarkPayment} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                Record Payment
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Invoice Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice {deleteTarget?.invoice_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the invoice along with its line items, recorded payments, and reminder history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteInvoice(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete Invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
