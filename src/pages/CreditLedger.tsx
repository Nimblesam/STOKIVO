import { PageHeader } from "@/components/PageHeader";
import { formatMoney } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Loader2, Mail, CheckCircle, ArrowUpRight, ArrowDownLeft, Download, Filter, Clock } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import type { Currency } from "@/lib/types";

interface LedgerEntry {
  id: string;
  customer_id: string;
  type: "CHARGE" | "PAYMENT";
  amount: number;
  description: string;
  reference_id: string | null;
  due_date: string | null;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
}

export default function CreditLedger() {
  const { profile, company } = useAuth();
  const { activeStoreId } = useStore();
  const currency = (company?.currency || "GBP") as Currency;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentCustomerId, setPaymentCustomerId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "CHARGE" | "PAYMENT">("all");
  const [dateFilter, setDateFilter] = useState("");

  const fetchData = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const [{ data: custs }, { data: entries }] = await Promise.all([
      supabase.from("customers").select("id, name, phone, email, whatsapp").eq("company_id", profile.company_id),
      supabase.from("customer_ledger").select("*").eq("company_id", profile.company_id).order("created_at", { ascending: true }),
    ]);
    setCustomers((custs || []) as Customer[]);
    setLedger((entries || []) as LedgerEntry[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile?.company_id]);

  // Calculate balances per customer from ledger
  const customerBalances = useMemo(() => {
    const map = new Map<string, { charges: number; payments: number; balance: number; overdueCount: number }>();
    const now = new Date();
    for (const entry of ledger) {
      if (!map.has(entry.customer_id)) {
        map.set(entry.customer_id, { charges: 0, payments: 0, balance: 0, overdueCount: 0 });
      }
      const rec = map.get(entry.customer_id)!;
      if (entry.type === "CHARGE") {
        rec.charges += entry.amount;
        rec.balance += entry.amount;
        if (entry.due_date && new Date(entry.due_date) < now) rec.overdueCount++;
      } else {
        rec.payments += entry.amount;
        rec.balance -= entry.amount;
      }
    }
    return map;
  }, [ledger]);

  const debtors = useMemo(() => {
    return customers
      .filter(c => {
        const bal = customerBalances.get(c.id);
        return bal && bal.balance > 0;
      })
      .map(c => ({ ...c, ...customerBalances.get(c.id)! }))
      .sort((a, b) => b.balance - a.balance);
  }, [customers, customerBalances]);

  const totalOutstanding = debtors.reduce((s, d) => s + d.balance, 0);
  const totalCharges = debtors.reduce((s, d) => s + d.charges, 0);
  const totalPayments = debtors.reduce((s, d) => s + d.payments, 0);
  const totalOverdue = debtors.filter(d => d.overdueCount > 0).reduce((s, d) => s + d.balance, 0);

  // Customer ledger entries with running balance
  const customerEntries = useMemo(() => {
    if (!selectedCustomerId) return [];
    let filtered = ledger.filter(e => e.customer_id === selectedCustomerId);
    if (typeFilter !== "all") filtered = filtered.filter(e => e.type === typeFilter);
    if (dateFilter) filtered = filtered.filter(e => e.created_at.startsWith(dateFilter));

    let running = 0;
    return filtered.map(e => {
      if (e.type === "CHARGE") running += e.amount;
      else running -= e.amount;
      return { ...e, runningBalance: running };
    });
  }, [selectedCustomerId, ledger, typeFilter, dateFilter]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const selectedBalance = customerBalances.get(selectedCustomerId || "") || { charges: 0, payments: 0, balance: 0, overdueCount: 0 };

  const handleRecordPayment = async () => {
    if (!paymentCustomerId || !profile?.company_id) return;
    const amt = Math.round(parseFloat(paymentAmount || "0") * 100);
    if (amt <= 0) { toast.error("Enter a valid amount"); return; }
    setSavingPayment(true);

    // Create PAYMENT ledger entry
    const { error } = await supabase.from("customer_ledger").insert({
      customer_id: paymentCustomerId,
      company_id: profile.company_id,
      store_id: activeStoreId,
      type: "PAYMENT" as any,
      amount: amt,
      description: paymentNote || "Manual payment",
    });

    if (error) { toast.error(error.message); setSavingPayment(false); return; }

    // Recalculate and update outstanding_balance on customers table
    const bal = customerBalances.get(paymentCustomerId);
    const newBalance = Math.max(0, (bal?.balance || 0) - amt);
    await supabase.from("customers").update({ outstanding_balance: newBalance }).eq("id", paymentCustomerId);

    toast.success("Payment recorded!");
    setShowAddPayment(false);
    setPaymentAmount("");
    setPaymentNote("");
    setPaymentCustomerId(null);
    setSavingPayment(false);
    fetchData();
  };

  const sendPaymentReminder = (customer: Customer & { balance: number }) => {
    if (!customer.email) { toast.error("Customer has no email address"); return; }
    const subject = encodeURIComponent(`Payment Reminder from ${company?.name || "Us"}`);
    const body = encodeURIComponent(
      `Dear ${customer.name},\n\n` +
      `This is a friendly reminder that you have an outstanding balance of ${formatMoney(customer.balance, currency)} with ${company?.name || "us"}.\n\n` +
      `Please arrange payment at your earliest convenience.\n\n` +
      `Thank you for your business.\n\n` +
      `Kind regards,\n${company?.name || "The Team"}`
    );
    window.open(`mailto:${customer.email}?subject=${subject}&body=${body}`);
    toast.success("Payment reminder email opened");
  };

  const exportCSV = () => {
    const rows = [["Date", "Customer", "Type", "Description", "Amount", "Running Balance"]];
    let running = 0;
    const sorted = [...ledger].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (const e of sorted) {
      const cust = customers.find(c => c.id === e.customer_id);
      if (e.type === "CHARGE") running += e.amount; else running -= e.amount;
      rows.push([
        new Date(e.created_at).toLocaleDateString(),
        cust?.name || "Unknown",
        e.type,
        e.description,
        (e.amount / 100).toFixed(2),
        (running / 100).toFixed(2),
      ]);
    }
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `credit-ledger-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Ledger exported!");
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Credit Ledger"
        subtitle="Ledger-based tracking — all charges and payments in one place"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={exportCSV}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stokivo-card p-4 border-destructive/20">
          <p className="text-xs text-muted-foreground font-medium">Total Outstanding</p>
          <p className="text-2xl font-display font-bold text-destructive mt-1">{formatMoney(totalOutstanding, currency)}</p>
        </div>
        <div className="stokivo-card p-4 border-warning/20">
          <p className="text-xs text-muted-foreground font-medium">Overdue</p>
          <p className="text-2xl font-display font-bold text-warning mt-1">{formatMoney(totalOverdue, currency)}</p>
        </div>
        <div className="stokivo-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Total Charges</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{formatMoney(totalCharges, currency)}</p>
        </div>
        <div className="stokivo-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Total Payments</p>
          <p className="text-2xl font-display font-bold text-success mt-1">{formatMoney(totalPayments, currency)}</p>
        </div>
      </div>

      {/* Debtors Table */}
      <div className="stokivo-card overflow-hidden mb-6">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" /> Customer Balances
          </h3>
          <span className="text-xs text-muted-foreground">{debtors.length} debtor{debtors.length !== 1 ? "s" : ""}</span>
        </div>
        {debtors.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>No outstanding balances</p>
            <p className="text-sm mt-1">Pay Later sales will automatically create ledger entries here</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Charges</TableHead>
                <TableHead className="text-right">Payments</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debtors.map((d) => (
                <TableRow key={d.id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setSelectedCustomerId(d.id); setTypeFilter("all"); setDateFilter(""); }}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.email || d.phone || "—"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm">{formatMoney(d.charges, currency)}</TableCell>
                  <TableCell className="text-right text-sm text-success">{formatMoney(d.payments, currency)}</TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-bold text-destructive">{formatMoney(d.balance, currency)}</span>
                  </TableCell>
                  <TableCell>
                    {d.overdueCount > 0 ? (
                      <Badge variant="destructive" className="text-xs gap-1"><Clock className="h-3 w-3" /> Overdue</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => sendPaymentReminder(d)}>
                        <Mail className="h-3 w-3" /> Remind
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-success" onClick={() => { setPaymentCustomerId(d.id); setShowAddPayment(true); }}>
                        <Plus className="h-3 w-3" /> Payment
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={showAddPayment} onOpenChange={setShowAddPayment}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Customer: <span className="font-medium text-foreground">{customers.find(c => c.id === paymentCustomerId)?.name}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Balance: <span className="font-bold text-destructive">{formatMoney(customerBalances.get(paymentCustomerId || "")?.balance || 0, currency)}</span>
            </p>
            <div>
              <Label>Amount *</Label>
              <Input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" className="mt-1" autoFocus />
            </div>
            <div>
              <Label>Note</Label>
              <Input value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="e.g. Cash payment" className="mt-1" />
            </div>
            <Button onClick={handleRecordPayment} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={savingPayment}>
              {savingPayment ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Ledger Detail Dialog */}
      <Dialog open={!!selectedCustomerId} onOpenChange={() => setSelectedCustomerId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              {selectedCustomer?.name} — Ledger
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              {/* Balance summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <p className="text-xs text-muted-foreground">Total Charges</p>
                  <p className="text-lg font-bold text-foreground">{formatMoney(selectedBalance.charges, currency)}</p>
                </div>
                <div className="p-3 rounded-lg bg-success/5 text-center">
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                  <p className="text-lg font-bold text-success">{formatMoney(selectedBalance.payments, currency)}</p>
                </div>
                <div className="p-3 rounded-lg bg-destructive/5 text-center">
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <p className="text-lg font-bold text-destructive">{formatMoney(selectedBalance.balance, currency)}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => sendPaymentReminder({ ...selectedCustomer, balance: selectedBalance.balance } as any)}>
                  <Mail className="h-3 w-3" /> Send Reminder
                </Button>
                <Button size="sm" className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => { setPaymentCustomerId(selectedCustomer.id); setShowAddPayment(true); }}>
                  <Plus className="h-3 w-3" /> Record Payment
                </Button>
              </div>

              {/* Filters */}
              <div className="flex gap-2 items-center">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                  <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="CHARGE">Charges</SelectItem>
                    <SelectItem value="PAYMENT">Payments</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-8 w-[150px] text-xs" placeholder="Filter by date" />
                {(typeFilter !== "all" || dateFilter) && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setTypeFilter("all"); setDateFilter(""); }}>Clear</Button>
                )}
              </div>

              {/* Ledger Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                     <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerEntries.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No entries found</TableCell></TableRow>
                    ) : (
                      customerEntries.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {e.type === "CHARGE" ? (
                              <Badge variant="destructive" className="text-xs gap-1"><ArrowUpRight className="h-3 w-3" /> Charge</Badge>
                            ) : (
                              <Badge className="text-xs gap-1 bg-success text-success-foreground"><ArrowDownLeft className="h-3 w-3" /> Payment</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{e.description}</TableCell>
                          <TableCell className={`text-right text-sm font-medium ${e.type === "CHARGE" ? "text-destructive" : "text-success"}`}>
                            {e.type === "CHARGE" ? "+" : "-"}{formatMoney(e.amount, currency)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-bold">{formatMoney(e.runningBalance, currency)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
