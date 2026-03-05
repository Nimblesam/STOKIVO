import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Users, Building2,
  ShoppingCart, Package, ArrowUpRight, ArrowDownRight, Calendar,
} from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, isAfter, isBefore } from "date-fns";

const CHART_COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))",
];

type DateRange = "7d" | "30d" | "90d" | "12m";

export default function AdminAnalytics() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  useEffect(() => {
    const load = async () => {
      const [c, s, p, u, sub, inv] = await Promise.all([
        supabase.from("companies").select("id, name, plan, status, created_at, country, currency"),
        supabase.from("sales").select("id, total, created_at, company_id, discount, tax"),
        supabase.from("products").select("id, company_id, stock_qty, cost_price, selling_price, category, created_at"),
        supabase.from("profiles").select("id, company_id, created_at"),
        supabase.from("subscriptions").select("id, plan, company_id, started_at, expires_at"),
        supabase.from("invoices").select("id, total, status, company_id, created_at"),
      ]);
      setCompanies(c.data || []);
      setSales(s.data || []);
      setProducts(p.data || []);
      setUsers(u.data || []);
      setSubscriptions(sub.data || []);
      setInvoices(inv.data || []);
    };
    load();
  }, []);

  const rangeStart = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case "7d": return subDays(now, 7);
      case "30d": return subDays(now, 30);
      case "90d": return subDays(now, 90);
      case "12m": return subMonths(now, 12);
    }
  }, [dateRange]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const afterStart = isAfter(new Date(s.created_at), rangeStart);
      const matchesCompany = companyFilter === "all" || s.company_id === companyFilter;
      return afterStart && matchesCompany;
    });
  }, [sales, rangeStart, companyFilter]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(i => {
      const afterStart = isAfter(new Date(i.created_at), rangeStart);
      const matchesCompany = companyFilter === "all" || i.company_id === companyFilter;
      return afterStart && matchesCompany;
    });
  }, [invoices, rangeStart, companyFilter]);

  // Revenue trend
  const revenueTrend = useMemo(() => {
    const days = dateRange === "12m" ? 365 : dateRange === "90d" ? 90 : dateRange === "30d" ? 30 : 7;
    const buckets: Record<string, number> = {};
    const fmt = days > 60 ? "MMM yyyy" : "dd MMM";
    for (let i = days - 1; i >= 0; i--) {
      const day = format(subDays(new Date(), i), fmt);
      if (!buckets[day]) buckets[day] = 0;
    }
    filteredSales.forEach(s => {
      const key = format(new Date(s.created_at), fmt);
      if (buckets[key] !== undefined) buckets[key] += (s.total || 0) / 100;
    });
    return Object.entries(buckets).map(([date, revenue]) => ({ date, revenue: Math.round(revenue) }));
  }, [filteredSales, dateRange]);

  // Company revenue ranking
  const companyRevenue = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; sales: number }> = {};
    filteredSales.forEach(s => {
      if (!map[s.company_id]) {
        const comp = companies.find(c => c.id === s.company_id);
        map[s.company_id] = { name: comp?.name || "Unknown", revenue: 0, sales: 0 };
      }
      map[s.company_id].revenue += (s.total || 0) / 100;
      map[s.company_id].sales++;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filteredSales, companies]);

  // Plan distribution
  const planDist = useMemo(() => {
    const counts: Record<string, number> = { starter: 0, growth: 0, pro: 0 };
    companies.forEach(c => { counts[c.plan] = (counts[c.plan] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [companies]);

  // Country distribution
  const countryDist = useMemo(() => {
    const counts: Record<string, number> = {};
    companies.forEach(c => { counts[c.country] = (counts[c.country] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [companies]);

  // Invoice status breakdown
  const invoiceStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredInvoices.forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredInvoices]);

  // Inventory value
  const inventoryValue = useMemo(() => {
    const filtered = companyFilter === "all" ? products : products.filter(p => p.company_id === companyFilter);
    const costValue = filtered.reduce((sum, p) => sum + (p.cost_price * p.stock_qty) / 100, 0);
    const retailValue = filtered.reduce((sum, p) => sum + (p.selling_price * p.stock_qty) / 100, 0);
    return { costValue: Math.round(costValue), retailValue: Math.round(retailValue), totalProducts: filtered.length };
  }, [products, companyFilter]);

  const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total || 0) / 100, 0);
  const totalDiscount = filteredSales.reduce((sum, s) => sum + (s.discount || 0) / 100, 0);
  const totalTax = filteredSales.reduce((sum, s) => sum + (s.tax || 0) / 100, 0);
  const avgSale = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Platform Analytics</h1>
          <p className="text-sm text-muted-foreground">Detailed insights across all tenants</p>
        </div>
        <div className="flex gap-2">
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All Companies" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-xl font-bold">£{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-muted-foreground mt-1">{filteredSales.length} sales</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Avg Sale</p>
          <p className="text-xl font-bold">£{avgSale.toFixed(2)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Discounts</p>
          <p className="text-xl font-bold">£{totalDiscount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Inventory (Cost)</p>
          <p className="text-xl font-bold">£{inventoryValue.costValue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">{inventoryValue.totalProducts} products</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Inventory (Retail)</p>
          <p className="text-xl font-bold">£{inventoryValue.retailValue.toLocaleString()}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue Trend</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.floor(revenueTrend.length / 8)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid hsl(var(--border))' }} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Companies */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Top Companies by Revenue</CardTitle></CardHeader>
            <CardContent>
              {companyRevenue.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No sales data in this period</p>
              ) : (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={companyRevenue} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`£${v.toFixed(0)}`, "Revenue"]} />
                      <Bar dataKey="revenue" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Companies Tab */}
        <TabsContent value="companies" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Plan Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={planDist} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {planDist.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Companies by Country</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={countryDist}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Company Table */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Company Breakdown</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Sales</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.slice(0, 20).map(c => {
                    const compSales = sales.filter(s => s.company_id === c.id);
                    const rev = compSales.reduce((sum, s) => sum + (s.total || 0) / 100, 0);
                    const prods = products.filter(p => p.company_id === c.id).length;
                    const usrs = users.filter(u => u.company_id === c.id).length;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{c.plan}</Badge></TableCell>
                        <TableCell>{prods}</TableCell>
                        <TableCell>{usrs}</TableCell>
                        <TableCell>{compSales.length}</TableCell>
                        <TableCell className="font-medium">£{rev.toFixed(0)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Invoice Status Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={invoiceStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {invoiceStatus.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between p-2 rounded bg-muted/50">
                  <span className="text-sm">Total Invoices</span>
                  <span className="font-bold">{filteredInvoices.length}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted/50">
                  <span className="text-sm">Total Value</span>
                  <span className="font-bold">£{(filteredInvoices.reduce((s, i) => s + (i.total || 0), 0) / 100).toFixed(0)}</span>
                </div>
                {invoiceStatus.map(s => (
                  <div key={s.name} className="flex justify-between p-2 rounded bg-muted/50">
                    <span className="text-sm capitalize">{s.name}</span>
                    <Badge variant="outline">{s.value}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{companies.length}</p>
              <p className="text-xs text-muted-foreground">Companies</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{users.length}</p>
              <p className="text-xs text-muted-foreground">Users</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{products.length}</p>
              <p className="text-xs text-muted-foreground">Products</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{sales.length}</p>
              <p className="text-xs text-muted-foreground">Total Sales</p>
            </CardContent></Card>
          </div>

          {/* Category breakdown */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Product Categories</CardTitle></CardHeader>
            <CardContent>
              {(() => {
                const cats: Record<string, number> = {};
                const filtered = companyFilter === "all" ? products : products.filter(p => p.company_id === companyFilter);
                filtered.forEach(p => { cats[p.category || "Uncategorized"] = (cats[p.category || "Uncategorized"] || 0) + 1; });
                const data = Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
                return (
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="value" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
