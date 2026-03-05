import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, DollarSign, TrendingUp, Receipt, Building2, CreditCard, Eye } from "lucide-react";
import { format } from "date-fns";

const PLATFORM_FEE_RATE = 0.005; // 0.5%

export default function AdminTransactions() {
  const [sales, setSales] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [feesByCompany, setFeesByCompany] = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [salePayments, setSalePayments] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [salesRes, subsRes] = await Promise.all([
        supabase
          .from("sales")
          .select("*, companies(name, currency, plan, stripe_account_id)")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("subscriptions")
          .select("*, companies(name, currency)")
          .order("started_at", { ascending: false }),
      ]);

      const salesData = salesRes.data || [];
      setSales(salesData);
      setSubscriptions(subsRes.data || []);

      // Aggregate fees by company
      const companyFees: Record<string, { name: string; total: number; fees: number; net: number; currency: string; salesCount: number; stripeConnected: boolean }> = {};
      salesData.forEach((s: any) => {
        const cid = s.company_id;
        if (!companyFees[cid]) companyFees[cid] = {
          name: s.companies?.name || "Unknown",
          total: 0, fees: 0, net: 0,
          currency: s.companies?.currency || "GBP",
          salesCount: 0,
          stripeConnected: !!s.companies?.stripe_account_id,
        };
        const fee = Math.round((s.total || 0) * PLATFORM_FEE_RATE);
        companyFees[cid].total += s.total || 0;
        companyFees[cid].fees += fee;
        companyFees[cid].net += (s.total || 0) - fee;
        companyFees[cid].salesCount += 1;
      });
      setFeesByCompany(Object.entries(companyFees).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.fees - a.fees));
    };
    load();
  }, []);

  const viewSaleDetail = async (sale: any) => {
    setSelectedSale(sale);
    const [items, payments] = await Promise.all([
      supabase.from("sale_items").select("*").eq("sale_id", sale.id),
      supabase.from("sale_payments").select("*").eq("sale_id", sale.id),
    ]);
    setSaleItems(items.data || []);
    setSalePayments(payments.data || []);
  };

  const exportCsv = () => {
    const rows = filtered.map(s => {
      const fee = Math.round(s.total * PLATFORM_FEE_RATE);
      return [
        (s as any).companies?.name,
        format(new Date(s.created_at), "yyyy-MM-dd HH:mm"),
        (s.total / 100).toFixed(2),
        (fee / 100).toFixed(2),
        ((s.total - fee) / 100).toFixed(2),
        (s as any).companies?.currency,
        s.status,
        s.cashier_name,
      ];
    });
    const csv = "Company,Date,Amount,Platform Fee,Net Payout,Currency,Status,Cashier\n" + rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "transactions.csv"; a.click();
  };

  const totalVolume = sales.reduce((s, r) => s + (r.total || 0), 0);
  const totalFees = Math.round(totalVolume * PLATFORM_FEE_RATE);
  const totalNet = totalVolume - totalFees;

  // Subscription revenue calculation
  const planPrices: Record<string, number> = { starter: 0, growth: 2900, pro: 7900 }; // pence/month
  const activeSubRevenue = subscriptions.reduce((sum, sub) => {
    const isActive = !sub.expires_at || new Date(sub.expires_at) > new Date();
    return sum + (isActive ? (planPrices[sub.plan] || 0) : 0);
  }, 0);

  const companyNames = [...new Set(sales.map(s => (s as any).companies?.name).filter(Boolean))].sort();

  const filtered = sales.filter(s => {
    const name = (s as any).companies?.name || "";
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) || s.cashier_name?.toLowerCase().includes(search.toLowerCase());
    const matchesCompany = companyFilter === "all" || name === companyFilter;
    return matchesSearch && matchesCompany;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions & Revenue</h1>
          <p className="text-sm text-muted-foreground">All payments flow through Stripe Connect. Platform commission is automatically deducted.</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" />Total Sales Volume</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">£{(totalVolume / 100).toLocaleString("en", { minimumFractionDigits: 2 })}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" />Platform Commission (0.5%)</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-emerald-600">£{(totalFees / 100).toLocaleString("en", { minimumFractionDigits: 2 })}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3" />Net to Merchants</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">£{(totalNet / 100).toLocaleString("en", { minimumFractionDigits: 2 })}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Receipt className="h-3 w-3" />Subscription MRR</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-primary">£{(activeSubRevenue / 100).toLocaleString("en", { minimumFractionDigits: 2 })}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />Total Transactions</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">{sales.length}</p><p className="text-xs text-muted-foreground">{feesByCompany.length} companies</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">All Transactions</TabsTrigger>
          <TabsTrigger value="fees">Revenue by Company</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscription Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search company or cashier..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All companies" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companyNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Platform Fee</TableHead>
                  <TableHead className="text-right">Net Payout</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map((s) => {
                  const fee = Math.round(s.total * PLATFORM_FEE_RATE);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{(s as any).companies?.name}</TableCell>
                      <TableCell className="text-xs">{format(new Date(s.created_at), "dd MMM yyyy HH:mm")}</TableCell>
                      <TableCell className="text-xs">{s.cashier_name}</TableCell>
                      <TableCell className="text-right text-xs">£{(s.subtotal / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-xs">{s.tax > 0 ? `£${(s.tax / 100).toFixed(2)}` : "—"}</TableCell>
                      <TableCell className="text-right text-xs">{s.discount > 0 ? `£${(s.discount / 100).toFixed(2)}` : "—"}</TableCell>
                      <TableCell className="text-right font-medium">£{(s.total / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-medium">£{(fee / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-right">£{((s.total - fee) / 100).toFixed(2)}</TableCell>
                      <TableCell><Badge variant={s.status === "completed" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => viewSaleDetail(s)}><Eye className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No transactions found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 100 && <p className="text-xs text-muted-foreground text-center">Showing 100 of {filtered.length} transactions</p>}
        </TabsContent>

        <TabsContent value="fees">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Sales Count</TableHead>
                  <TableHead className="text-right">Total Volume</TableHead>
                  <TableHead className="text-right">Platform Fees</TableHead>
                  <TableHead className="text-right">Net to Merchant</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Stripe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feesByCompany.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right">{c.salesCount}</TableCell>
                    <TableCell className="text-right">£{(c.total / 100).toLocaleString("en", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">£{(c.fees / 100).toLocaleString("en", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">£{(c.net / 100).toLocaleString("en", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{c.currency}</TableCell>
                    <TableCell>
                      <Badge variant={c.stripeConnected ? "default" : "secondary"} className="text-[10px]">
                        {c.stripeConnected ? "Connected" : "Not Connected"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="subscriptions">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Monthly Price</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => {
                  const isExpired = sub.expires_at && new Date(sub.expires_at) < new Date();
                  const price = planPrices[sub.plan] || 0;
                  return (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{(sub as any).companies?.name || "Unknown"}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{sub.plan}</Badge></TableCell>
                      <TableCell className="text-right">{price > 0 ? `£${(price / 100).toFixed(2)}/mo` : "Free"}</TableCell>
                      <TableCell className="text-xs">{format(new Date(sub.started_at), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-xs">
                        {sub.expires_at ? (
                          <span className={isExpired ? "text-destructive font-medium" : ""}>
                            {format(new Date(sub.expires_at), "dd MMM yyyy")}
                            {isExpired && " (EXPIRED)"}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isExpired ? "destructive" : "default"}>
                          {isExpired ? "Expired" : "Active"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {subscriptions.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No subscriptions found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Sale Detail Dialog */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transaction Detail</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-muted-foreground">Company</span><p className="font-medium">{(selectedSale as any).companies?.name}</p></div>
                <div><span className="text-xs text-muted-foreground">Cashier</span><p>{selectedSale.cashier_name}</p></div>
                <div><span className="text-xs text-muted-foreground">Date</span><p>{format(new Date(selectedSale.created_at), "dd MMM yyyy HH:mm")}</p></div>
                <div><span className="text-xs text-muted-foreground">Status</span><p><Badge variant="default">{selectedSale.status}</Badge></p></div>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-medium mb-2">Items</h4>
                {saleItems.length > 0 ? (
                  <div className="space-y-1">
                    {saleItems.map(item => (
                      <div key={item.id} className="flex justify-between text-xs">
                        <span>{item.product_name} × {item.qty}</span>
                        <span>£{(item.line_total / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted-foreground">No items found</p>}
              </div>

              <div className="border-t pt-3">
                <h4 className="font-medium mb-2">Payment Methods</h4>
                {salePayments.length > 0 ? (
                  <div className="space-y-1">
                    {salePayments.map(p => (
                      <div key={p.id} className="flex justify-between text-xs">
                        <span className="capitalize">{p.method}{p.reference ? ` (${p.reference})` : ""}</span>
                        <span>£{(p.amount / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted-foreground">No payment records</p>}
              </div>

              <div className="border-t pt-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>£{(selectedSale.subtotal / 100).toFixed(2)}</span></div>
                {selectedSale.tax > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>£{(selectedSale.tax / 100).toFixed(2)}</span></div>}
                {selectedSale.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-£{(selectedSale.discount / 100).toFixed(2)}</span></div>}
                <div className="flex justify-between font-medium text-sm"><span>Total</span><span>£{(selectedSale.total / 100).toFixed(2)}</span></div>
                <div className="flex justify-between text-emerald-600"><span>Platform Fee (0.5%)</span><span>£{(Math.round(selectedSale.total * PLATFORM_FEE_RATE) / 100).toFixed(2)}</span></div>
                <div className="flex justify-between font-medium"><span>Net to Merchant</span><span>£{((selectedSale.total - Math.round(selectedSale.total * PLATFORM_FEE_RATE)) / 100).toFixed(2)}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
