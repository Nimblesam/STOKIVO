import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/currency";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Banknote, Loader2, ArrowDownToLine } from "lucide-react";
import type { Currency } from "@/lib/types";
import { format } from "date-fns";

export default function Payouts() {
  const { profile, company } = useAuth();
  const currency = (company?.currency || "GBP") as Currency;
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.company_id) return;
    const fetchPayouts = async () => {
      setLoading(true);
      // Fetch all sale_payments with sale info
      const { data: sales } = await supabase
        .from("sales")
        .select("id, total, created_at, cashier_name")
        .eq("company_id", profile.company_id!)
        .order("created_at", { ascending: false });

      if (!sales || sales.length === 0) {
        setPayments([]);
        setLoading(false);
        return;
      }

      const { data: salePayments } = await supabase
        .from("sale_payments")
        .select("*")
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

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Payouts"
        subtitle="All payments received and sent to your bank account"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="zentra-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Total Received</p>
          <p className="text-2xl font-display font-bold text-foreground">{formatMoney(totalPaid, currency)}</p>
        </div>
        <div className="zentra-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Transactions</p>
          <p className="text-2xl font-display font-bold text-foreground">{payments.length}</p>
        </div>
        <div className="zentra-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Platform Fee (0.5%)</p>
          <p className="text-2xl font-display font-bold text-destructive">-{formatMoney(Math.round(totalPaid * 0.005), currency)}</p>
        </div>
      </div>

      <div className="zentra-card">
        <div className="p-4 border-b flex items-center gap-2">
          <ArrowDownToLine className="h-4 w-4 text-accent" />
          <h3 className="font-semibold text-foreground">Payment History</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Banknote className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No payments yet</p>
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
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{format(new Date(p.created_at), "dd MMM yyyy, HH:mm")}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{p.method}</Badge>
                    </TableCell>
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
