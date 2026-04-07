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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Banknote, Loader2, ArrowDownToLine, Download, Filter, CreditCard, ShoppingBag } from "lucide-react";
import type { Currency } from "@/lib/types";
import { format } from "date-fns";

export default function Payouts() {
  const { profile, company } = useAuth();
  const currency = (company?.currency || "GBP") as Currency;

  // Stripe payouts state
  const [stripePayouts, setStripePayouts] = useState<any[]>([]);
  const [stripeLoading, setStripeLoading] = useState(true);
  const stripeConnected = !!company?.stripe_account_id;

  // Daily sales state
  const [sales, setSales] = useState<any[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Fetch Stripe payouts
  useEffect(() => {
    if (!profile?.company_id || !stripeConnected) {
      setStripePayouts([]);
      setStripeLoading(false);
      return;
    }
    const fetchPayouts = async () => {
      setStripeLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("stripe-connect-status", {
          body: {},
        });
        // Stripe payouts come from Stripe API — if no endpoint exists yet, show empty
        setStripePayouts(data?.payouts || []);
      } catch {
        setStripePayouts([]);
      } finally {
        setStripeLoading(false);
      }
    };
    fetchPayouts();
  }, [profile?.company_id, stripeConnected]);

  // Fetch daily sales with full details
  useEffect(() => {
    if (!profile?.company_id) return;
    const fetchSales = async () => {
      setSalesLoading(true);
      const { data: salesData } = await supabase
        .from("sales")
        .select("id, total, subtotal, discount, tax, created_at, cashier_name, status, store_id")
        .eq("company_id", profile.company_id!)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!salesData || salesData.length === 0) { setSales([]); setSalesLoading(false); return; }

      // Fetch sale items and payments
      const saleIds = salesData.map(s => s.id);
      const [itemsRes, paymentsRes] = await Promise.all([
        supabase.from("sale_items").select("sale_id, product_name, qty, unit_price, line_total").in("sale_id", saleIds),
        supabase.from("sale_payments").select("sale_id, method, amount").in("sale_id", saleIds),
      ]);

      const itemsBySale = new Map<string, any[]>();
      (itemsRes.data || []).forEach(item => {
        const arr = itemsBySale.get(item.sale_id) || [];
        arr.push(item);
        itemsBySale.set(item.sale_id, arr);
      });

      const paymentsBySale = new Map<string, any[]>();
      (paymentsRes.data || []).forEach(p => {
        const arr = paymentsBySale.get(p.sale_id) || [];
        arr.push(p);
        paymentsBySale.set(p.sale_id, arr);
      });

      const enriched = salesData.map(sale => ({
        ...sale,
        items: itemsBySale.get(sale.id) || [],
        payments: paymentsBySale.get(sale.id) || [],
        paymentMethods: [...new Set((paymentsBySale.get(sale.id) || []).map((p: any) => p.method))].join(", ") || (sale.status === "pending" ? "Pay Later" : "—"),
      }));

      setSales(enriched);
      setSalesLoading(false);
    };
    fetchSales();
  }, [profile?.company_id]);

  // Filter sales
  const filteredSales = sales.filter(s => {
    if (methodFilter !== "all") {
      const methods = (s.payments || []).map((p: any) => p.method);
      if (methodFilter === "pay_later") {
        if (s.status !== "pending") return false;
      } else if (!methods.includes(methodFilter)) return false;
    }
    if (dateFrom && new Date(s.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(s.created_at) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  });

  const totalSalesRevenue = filteredSales.reduce((s, sale) => s + sale.total, 0);
  const totalItems = filteredSales.reduce((s, sale) => s + (sale.items || []).reduce((a: number, i: any) => a + i.qty, 0), 0);
  const allMethods = [...new Set(sales.flatMap(s => (s.payments || []).map((p: any) => p.method)))];

  const handleExportSales = () => {
    const lines = ["Date,Cashier,Products,Qty,Payment Method,Status,Total"];
    filteredSales.forEach(s => {
      const products = (s.items || []).map((i: any) => `${i.product_name} x${i.qty}`).join("; ");
      const qty = (s.items || []).reduce((a: number, i: any) => a + i.qty, 0);
      lines.push(`"${format(new Date(s.created_at), "dd MMM yyyy HH:mm")}","${s.cashier_name}","${products}",${qty},"${s.paymentMethods}","${s.status}",${(s.total / 100).toFixed(2)}`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "daily-sales.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Payouts & Sales"
        subtitle="Track Stripe payouts and daily sales activity"
        badge={<PlanBadge feature="stripe_payouts" />}
      />

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="stripe" className="gap-2">
            <CreditCard className="h-4 w-4" /> Stripe Payouts
          </TabsTrigger>
          <TabsTrigger value="sales" className="gap-2">
            <ShoppingBag className="h-4 w-4" /> Daily Sales
          </TabsTrigger>
        </TabsList>

        {/* STRIPE PAYOUTS TAB */}
        <TabsContent value="stripe">
          {!stripeConnected ? (
            <div className="stokivo-card p-12 text-center">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Payment Account Connected</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Connect your payment account in Settings → Payments to start receiving payouts to your bank account.
              </p>
            </div>
          ) : stripeLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : stripePayouts.length === 0 ? (
            <div className="stokivo-card p-12 text-center">
              <Banknote className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Payouts Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Stripe payouts will appear here once your payment provider sends funds to your bank account. This typically happens on a rolling schedule after card sales.
              </p>
            </div>
          ) : (
            <div className="stokivo-card">
              <div className="p-4 border-b flex items-center gap-2">
                <ArrowDownToLine className="h-4 w-4 text-accent" />
                <h3 className="font-semibold text-foreground">Payout History</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stripePayouts.map((p: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell>{p.arrival_date ? format(new Date(p.arrival_date * 1000), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize">{p.status}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">{formatMoney(p.amount, currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* DAILY SALES TAB */}
        <TabsContent value="sales">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="stokivo-card p-5">
              <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
              <p className="text-2xl font-display font-bold text-foreground">{formatMoney(totalSalesRevenue, currency)}</p>
            </div>
            <div className="stokivo-card p-5">
              <p className="text-xs text-muted-foreground mb-1">Total Orders</p>
              <p className="text-2xl font-display font-bold text-foreground">{filteredSales.length}</p>
            </div>
            <div className="stokivo-card p-5">
              <p className="text-xs text-muted-foreground mb-1">Items Sold</p>
              <p className="text-2xl font-display font-bold text-foreground">{totalItems}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="stokivo-card p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Filters</span>
              <div className="ml-auto">
                <Button variant="outline" size="sm" className="gap-2" onClick={handleExportSales} disabled={filteredSales.length === 0}>
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger><SelectValue placeholder="Payment Method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  {allMethods.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                  <SelectItem value="pay_later">Pay Later</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" />
            </div>
          </div>

          <div className="stokivo-card">
            <div className="p-4 border-b flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-accent" />
              <h3 className="font-semibold text-foreground">Sales History</h3>
            </div>
            <div className="overflow-x-auto">
              {salesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredSales.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p>No sales found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Products Sold</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Cashier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map(sale => (
                      <TableRow key={sale.id}>
                        <TableCell className="text-sm whitespace-nowrap">{format(new Date(sale.created_at), "dd MMM yyyy, HH:mm")}</TableCell>
                        <TableCell className="text-sm max-w-[200px]">
                          <div className="space-y-0.5">
                            {(sale.items || []).slice(0, 3).map((item: any, idx: number) => (
                              <div key={idx} className="text-xs">
                                {item.product_name} <span className="text-muted-foreground">×{item.qty}</span>
                              </div>
                            ))}
                            {(sale.items || []).length > 3 && (
                              <span className="text-xs text-muted-foreground">+{(sale.items || []).length - 3} more</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">{(sale.items || []).reduce((a: number, i: any) => a + i.qty, 0)}</TableCell>
                        <TableCell>
                          {sale.paymentMethods.split(", ").map((m: string, i: number) => (
                            <Badge key={i} variant="secondary" className="capitalize mr-1 text-xs">{m}</Badge>
                          ))}
                        </TableCell>
                        <TableCell className="text-sm">{sale.cashier_name}</TableCell>
                        <TableCell>
                          <Badge variant={sale.status === "completed" ? "default" : "outline"} className="capitalize text-xs">
                            {sale.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-sm">{formatMoney(sale.total, currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
