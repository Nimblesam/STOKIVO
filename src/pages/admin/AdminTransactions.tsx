import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Download, DollarSign, TrendingUp, TrendingDown, Receipt, Building2,
  CreditCard, Eye, AlertTriangle, ArrowUpRight, ArrowDownRight, Minus,
  Filter, Calendar, Activity, Users, Bell,
} from "lucide-react";
import { format, subDays, startOfDay, isToday, isWithinInterval } from "date-fns";
import { AdminPagination } from "@/components/admin/AdminPagination";

const PLATFORM_FEE_RATE = 0.005;

interface Alert {
  id: string;
  message: string;
  severity: "warning" | "critical" | "info";
  companyFilter?: string;
}

export default function AdminTransactions() {
  const [sales, setSales] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("7d");
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [salePayments, setSalePayments] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const load = async () => {
      const [salesRes, subsRes] = await Promise.all([
        supabase
          .from("sales")
          .select("*, companies(name, currency, plan, stripe_account_id)")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("subscriptions")
          .select("*, companies(name, currency)")
          .order("started_at", { ascending: false }),
      ]);
      setSales(salesRes.data || []);
      setSubscriptions(subsRes.data || []);
    };
    load();
  }, []);

  useEffect(() => { setPage(1); }, [search, companyFilter, statusFilter, dateRange]);

  // Date filtering
  const dateFilterStart = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case "today": return startOfDay(now);
      case "7d": return subDays(now, 7);
      case "30d": return subDays(now, 30);
      case "90d": return subDays(now, 90);
      default: return subDays(now, 7);
    }
  }, [dateRange]);

  // Today metrics
  const todaySales = useMemo(() => sales.filter(s => isToday(new Date(s.created_at))), [sales]);
  const todayRevenue = todaySales.reduce((s, r) => s + (r.total || 0), 0);
  const todayFees = Math.round(todayRevenue * PLATFORM_FEE_RATE);
  const todayTransactions = todaySales.length;
  const pendingPayouts = sales.filter(s => s.status === "pending").reduce((s, r) => s + (r.total || 0), 0);

  // 7d comparison
  const prev7dSales = useMemo(() => {
    const start = subDays(new Date(), 14);
    const end = subDays(new Date(), 7);
    return sales.filter(s => {
      const d = new Date(s.created_at);
      return isWithinInterval(d, { start, end });
    });
  }, [sales]);
  const curr7dSales = useMemo(() => {
    const start = subDays(new Date(), 7);
    return sales.filter(s => new Date(s.created_at) >= start);
  }, [sales]);
  const revenueChange = prev7dSales.length > 0
    ? ((curr7dSales.reduce((s, r) => s + r.total, 0) - prev7dSales.reduce((s, r) => s + r.total, 0)) / Math.max(prev7dSales.reduce((s, r) => s + r.total, 0), 1)) * 100
    : 0;

  // Company-level insights
  const companyInsights = useMemo(() => {
    const map: Record<string, { name: string; todayRev: number; weekRev: number; prevWeekRev: number; txCount: number; currency: string; stripeConnected: boolean; totalRev: number; totalFees: number }> = {};
    sales.forEach((s: any) => {
      const cid = s.company_id;
      const cname = s.companies?.name || "Unknown";
      if (!map[cid]) map[cid] = { name: cname, todayRev: 0, weekRev: 0, prevWeekRev: 0, txCount: 0, currency: s.companies?.currency || "GBP", stripeConnected: !!s.companies?.stripe_account_id, totalRev: 0, totalFees: 0 };
      const total = s.total || 0;
      const d = new Date(s.created_at);
      map[cid].totalRev += total;
      map[cid].totalFees += Math.round(total * PLATFORM_FEE_RATE);
      map[cid].txCount += 1;
      if (isToday(d)) map[cid].todayRev += total;
      if (d >= subDays(new Date(), 7)) map[cid].weekRev += total;
      if (isWithinInterval(d, { start: subDays(new Date(), 14), end: subDays(new Date(), 7) })) map[cid].prevWeekRev += total;
    });
    return Object.entries(map).map(([id, v]) => {
      const trend = v.prevWeekRev > 0 ? ((v.weekRev - v.prevWeekRev) / v.prevWeekRev) * 100 : (v.weekRev > 0 ? 100 : 0);
      const status: "growing" | "stable" | "declining" = trend > 10 ? "growing" : trend < -10 ? "declining" : "stable";
      return { id, ...v, trend, status };
    }).sort((a, b) => b.totalFees - a.totalFees);
  }, [sales]);

  // Alerts
  const alerts = useMemo<Alert[]>(() => {
    const result: Alert[] = [];
    const noTxToday = companyInsights.filter(c => c.todayRev === 0 && c.txCount > 0);
    if (noTxToday.length > 0) {
      result.push({ id: "no-tx", message: `${noTxToday.length} merchant${noTxToday.length > 1 ? "s" : ""} ha${noTxToday.length > 1 ? "ve" : "s"} no transactions today`, severity: "warning" });
    }
    const bigDrops = companyInsights.filter(c => c.trend < -50 && c.prevWeekRev > 0);
    bigDrops.forEach(c => {
      result.push({ id: `drop-${c.id}`, message: `${c.name} revenue dropped ${Math.abs(Math.round(c.trend))}% vs last week`, severity: "critical", companyFilter: c.name });
    });
    const spikes = companyInsights.filter(c => c.trend > 200 && c.prevWeekRev > 0);
    spikes.forEach(c => {
      result.push({ id: `spike-${c.id}`, message: `Unusual spike detected for ${c.name} (+${Math.round(c.trend)}%)`, severity: "info", companyFilter: c.name });
    });
    return result;
  }, [companyInsights]);

  // Filtered sales
  const filtered = useMemo(() => {
    return sales.filter(s => {
      const name = (s as any).companies?.name || "";
      const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) || s.cashier_name?.toLowerCase().includes(search.toLowerCase());
      const matchesCompany = companyFilter === "all" || name === companyFilter;
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesDate = new Date(s.created_at) >= dateFilterStart;
      return matchesSearch && matchesCompany && matchesStatus && matchesDate;
    }).sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "total": aVal = a.total; bVal = b.total; break;
        case "company": aVal = a.companies?.name || ""; bVal = b.companies?.name || ""; break;
        default: aVal = a.created_at; bVal = b.created_at;
      }
      if (sortDir === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }, [sales, search, companyFilter, statusFilter, dateFilterStart, sortField, sortDir]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const companyNames = [...new Set(sales.map(s => (s as any).companies?.name).filter(Boolean))].sort();

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

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  // Subscription stats
  const planPrices: Record<string, number> = { starter: 0, growth: 2900, pro: 7900 };
  const activeSubs = subscriptions.filter(sub => !sub.expires_at || new Date(sub.expires_at) > new Date());
  const mrr = activeSubs.reduce((sum, sub) => sum + (planPrices[sub.plan] || 0), 0);
  const failedSubs = subscriptions.filter(sub => sub.expires_at && new Date(sub.expires_at) < new Date());
  const churnedCount = failedSubs.length;

  const handlePageChange = (p: number) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Control Centre</h1>
          <p className="text-sm text-muted-foreground">Monitor revenue, detect anomalies, and manage operations</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </div>

      {/* Top-Level KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Transactions Today</p>
                <p className="text-2xl font-bold mt-1">{todayTransactions}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Revenue Today</p>
                <p className="text-2xl font-bold mt-1">£{(todayRevenue / 100).toLocaleString("en", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            {revenueChange !== 0 && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${revenueChange > 0 ? "text-emerald-600" : "text-destructive"}`}>
                {revenueChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(Math.round(revenueChange))}% vs last 7 days
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-accent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Platform Fees Today</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">£{(todayFees / 100).toLocaleString("en", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Pending Payouts</p>
                <p className="text-2xl font-bold mt-1">£{(pendingPayouts / 100).toLocaleString("en", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Panel */}
      {alerts.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4 text-warning" />
              Alerts & Anomalies ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map(a => (
              <button
                key={a.id}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left"
                onClick={() => a.companyFilter ? setCompanyFilter(a.companyFilter) : null}
              >
                <AlertTriangle className={`h-4 w-4 shrink-0 ${a.severity === "critical" ? "text-destructive" : a.severity === "warning" ? "text-warning" : "text-primary"}`} />
                <span className="text-sm">{a.message}</span>
                {a.companyFilter && <span className="text-xs text-muted-foreground ml-auto">Click to filter →</span>}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="transactions" onValueChange={() => setPage(1)}>
        <TabsList>
          <TabsTrigger value="transactions">All Transactions</TabsTrigger>
          <TabsTrigger value="insights">Revenue by Company</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscription Revenue</TabsTrigger>
        </TabsList>

        {/* ALL TRANSACTIONS */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="flex flex-wrap gap-2">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("company")}>
                    Company {sortField === "company" && (sortDir === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                    Date {sortField === "created_at" && (sortDir === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("total")}>
                    Total {sortField === "total" && (sortDir === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="text-right">Platform Fee</TableHead>
                  <TableHead className="text-right">Net Payout</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((s) => {
                  const fee = Math.round(s.total * PLATFORM_FEE_RATE);
                  return (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewSaleDetail(s)}>
                      <TableCell className="font-medium">{(s as any).companies?.name}</TableCell>
                      <TableCell className="text-xs">{format(new Date(s.created_at), "dd MMM yyyy HH:mm")}</TableCell>
                      <TableCell className="text-xs">{s.cashier_name}</TableCell>
                      <TableCell className="text-right text-xs">£{(s.subtotal / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-xs">{s.tax > 0 ? `£${(s.tax / 100).toFixed(2)}` : "—"}</TableCell>
                      <TableCell className="text-right text-xs">{s.discount > 0 ? `£${(s.discount / 100).toFixed(2)}` : "—"}</TableCell>
                      <TableCell className="text-right font-medium">£{(s.total / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-medium">£{(fee / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-right">£{((s.total - fee) / 100).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === "completed" ? "default" : s.status === "failed" ? "destructive" : "secondary"}>
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); viewSaleDetail(s); }}><Eye className="h-4 w-4" /></Button>
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
          <AdminPagination
            currentPage={page}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        </TabsContent>

        {/* REVENUE BY COMPANY — Insights View */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-3">
            {companyInsights.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No company data available</p>
            ) : companyInsights.map((c) => (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.txCount} transactions · {c.currency}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={c.status === "growing" ? "default" : c.status === "declining" ? "destructive" : "secondary"} className="text-xs">
                        {c.status === "growing" && <ArrowUpRight className="h-3 w-3 mr-1" />}
                        {c.status === "declining" && <ArrowDownRight className="h-3 w-3 mr-1" />}
                        {c.status === "stable" && <Minus className="h-3 w-3 mr-1" />}
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </Badge>
                      {c.stripeConnected && <Badge variant="outline" className="text-[10px]">Stripe</Badge>}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Today</p>
                      <p className="text-sm font-bold">£{(c.todayRev / 100).toLocaleString("en", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">7 Days</p>
                      <p className="text-sm font-bold">£{(c.weekRev / 100).toLocaleString("en", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Trend</p>
                      <p className={`text-sm font-bold ${c.trend > 0 ? "text-emerald-600" : c.trend < 0 ? "text-destructive" : ""}`}>
                        {c.trend > 0 ? "+" : ""}{Math.round(c.trend)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Platform Fees</p>
                      <p className="text-sm font-bold text-emerald-600">£{(c.totalFees / 100).toLocaleString("en", { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SUBSCRIPTION REVENUE */}
        <TabsContent value="subscriptions" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Monthly Recurring Revenue</p>
                <p className="text-xl font-bold text-primary mt-1">£{(mrr / 100).toLocaleString("en", { minimumFractionDigits: 2 })}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Active Subscriptions</p>
                <p className="text-xl font-bold mt-1">{activeSubs.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Expired / Overdue</p>
                <p className="text-xl font-bold text-destructive mt-1">{churnedCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Subscriptions</p>
                <p className="text-xl font-bold mt-1">{subscriptions.length}</p>
              </CardContent>
            </Card>
          </div>
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
                        <span className="capitalize">{p.method}{p.provider ? ` (${p.provider})` : ""}</span>
                        <span>£{(p.amount / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted-foreground">No payments found</p>}
              </div>

              <div className="border-t pt-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Subtotal:</span> £{(selectedSale.subtotal / 100).toFixed(2)}</div>
                  <div><span className="text-muted-foreground">Tax:</span> £{(selectedSale.tax / 100).toFixed(2)}</div>
                  <div><span className="text-muted-foreground">Discount:</span> £{(selectedSale.discount / 100).toFixed(2)}</div>
                  <div className="font-bold"><span className="text-muted-foreground">Total:</span> £{(selectedSale.total / 100).toFixed(2)}</div>
                  <div><span className="text-muted-foreground">Platform Fee:</span> <span className="text-emerald-600">£{(Math.round(selectedSale.total * PLATFORM_FEE_RATE) / 100).toFixed(2)}</span></div>
                  <div><span className="text-muted-foreground">Change:</span> £{(selectedSale.change_given / 100).toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}