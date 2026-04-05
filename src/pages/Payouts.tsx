import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PlanBadge } from "@/components/PlanBadge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/currency";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, Loader2, ArrowDownToLine, Download, Filter } from "lucide-react";
import type { Currency } from "@/lib/types";
import { format } from "date-fns";

export default function Payouts() {
  const { profile, company } = useAuth();
  const currency = (company?.currency || "GBP") as Currency;
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchRef, setSearchRef] = useState("");

  useEffect(() => {
    if (!profile?.company_id) return;
    const fetchPayouts = async () => {
      setLoading(true);
      const { data: sales } = await supabase
        .from("sales")
        .select("id, total, created_at, cashier_name")
        .eq("company_id", profile.company_id!)
        .order("created_at", { ascending: false });

      if (!sales || sales.length === 0) { setPayments([]); setLoading(false); return; }

      const { data: salePayments } = await supabase
        .from("sale_payments").select("*")
        .in("sale_id", sales.map((s) => s.id))
        .order("created_at", { ascending: false });

      const merged = (salePayments || []).map((sp) => {
        const sale = sales.find((s) => s.id === sp.sale_id);
        return { ...sp, sale_total: sale?.total, sale_date: sale?.created_at, cashier: sale?.cashier_name };
      });
      setPayments(merged);
      setLoading(false);
    };
    fetchPayouts();
  }, [profile?.company_id]);

  // Filter payments
  const filtered = payments.filter((p) => {
    if (methodFilter !== "all" && p.method !== methodFilter) return false;
    if (dateFrom && new Date(p.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(p.created_at) > new Date(dateTo + "T23:59:59")) return false;
    if (searchRef && !(p.reference || "").toLowerCase().includes(searchRef.toLowerCase())) return false;
    return true;
  });

  const totalPaid = filtered.reduce((s, p) => s + p.amount, 0);
  const methods = [...new Set(payments.map(p => p.method))];

  const handleExport = () => {
    const lines = ["Date,Method,Reference,Cashier,Amount"];
    filtered.forEach((p) => {
      lines.push(`"${format(new Date(p.created_at), "dd MMM yyyy HH:mm")}","${p.method}","${p.reference || ""}","${p.cashier || ""}",${(p.amount / 100).toFixed(2)}`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "payouts.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Payouts"
        subtitle="All payments received and sent to your bank account"
        badge={<PlanBadge feature="stripe_payouts" />}
        actions={
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="stokivo-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Total Received</p>
          <p className="text-2xl font-display font-bold text-foreground">{formatMoney(totalPaid, currency)}</p>
        </div>
        <div className="stokivo-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Transactions</p>
          <p className="text-2xl font-display font-bold text-foreground">{filtered.length}</p>
        </div>
        <div className="stokivo-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Payment Methods</p>
          <p className="text-2xl font-display font-bold text-foreground">{methods.length || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="stokivo-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger><SelectValue placeholder="Method" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              {methods.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" />
          <Input value={searchRef} onChange={(e) => setSearchRef(e.target.value)} placeholder="Search reference..." />
        </div>
      </div>

      <div className="stokivo-card">
        <div className="p-4 border-b flex items-center gap-2">
          <ArrowDownToLine className="h-4 w-4 text-accent" />
          <h3 className="font-semibold text-foreground">Payment History</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Banknote className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No payments found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{format(new Date(p.created_at), "dd MMM yyyy, HH:mm")}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{p.method}</Badge></TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{p.reference || "—"}</TableCell>
                    <TableCell className="text-sm">{p.cashier || "—"}</TableCell>
                    <TableCell className="text-right font-semibold text-sm">{formatMoney(p.amount, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}