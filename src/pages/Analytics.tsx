import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { PlanBadge } from "@/components/PlanBadge";
import { KPICard } from "@/components/KPICard";
import { formatMoney } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, DollarSign, Package, BarChart3, AlertTriangle, CreditCard, TrendingDown, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import type { Currency } from "@/lib/types";

const COLORS = ["hsl(170,60%,40%)", "hsl(220,60%,50%)", "hsl(38,92%,50%)", "hsl(280,60%,50%)", "hsl(0,72%,51%)", "hsl(310,50%,50%)"];

export default function Analytics() {
  const { profile, company } = useAuth();
  const currency = (company?.currency || "GBP") as Currency;
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const [sales, setSales] = useState<any[]>([]);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.company_id) return;
    const cid = profile.company_id!;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(period));
    setLoading(true);

    Promise.all([
      supabase.from("sales").select("id, total, created_at").eq("company_id", cid)
        .gte("created_at", since.toISOString()),
      supabase.from("sale_items").select("product_id, product_name, qty, unit_price, line_total, sales!inner(company_id, created_at)")
        .eq("sales.company_id", cid).gte("sales.created_at", since.toISOString()),
      supabase.from("products").select("id, name, cost_price, selling_price, stock_qty, min_stock_level, category, profit_margin")
        .eq("company_id", cid),
      supabase.from("customers").select("id, name, outstanding_balance").eq("company_id", cid),
      supabase.from("supplier_price_history").select("id, product_id, old_cost, new_cost, changed_at")
        .order("changed_at", { ascending: false }).limit(10),
    ]).then(([sRes, siRes, pRes, cRes, phRes]) => {
      setSales(sRes.data || []);
      setSaleItems(siRes.data || []);
      setProducts(pRes.data || []);
      setCustomers(cRes.data || []);
      setPriceHistory(phRes.data || []);
      setLoading(false);
    });
  }, [profile?.company_id, period]);

  // KPIs
  const totalRevenue = sales.reduce((s, r) => s + r.total, 0);
  const productCostMap = new Map(products.map((p) => [p.id, p.cost_price]));
  const totalCOGS = saleItems.reduce((s, si) => s + (productCostMap.get(si.product_id) || 0) * si.qty, 0);
  const inventoryValue = products.reduce((s, p) => s + p.cost_price * p.stock_qty, 0);
  const avgMargin = products.length > 0
    ? products.reduce((s, p) => s + (p.profit_margin || 0), 0) / products.length : 0;
  const outstandingPayments = customers.reduce((s, c) => s + c.outstanding_balance, 0);
  const lowStockCount = products.filter((p) => p.stock_qty <= p.min_stock_level && p.min_stock_level > 0).length;

  // Daily Sales chart
  const dailyMap = new Map<string, number>();
  sales.forEach((s) => {
    const day = new Date(s.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    dailyMap.set(day, (dailyMap.get(day) || 0) + s.total);
  });
  const dailySales = Array.from(dailyMap.entries())
    .map(([day, sales]) => ({ day, sales }))
    .sort((a, b) => {
      const parse = (str: string) => { const [d, m] = str.split(" "); return new Date(`${d} ${m} ${new Date().getFullYear()}`); };
      return parse(a.day).getTime() - parse(b.day).getTime();
    });

  // Margin trend by week
  const weekMap = new Map<string, { revenue: number; cost: number }>();
  sales.forEach((s) => {
    const d = new Date(s.created_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    const entry = weekMap.get(key) || { revenue: 0, cost: 0 };
    entry.revenue += s.total;
    weekMap.set(key, entry);
  });
  saleItems.forEach((si: any) => {
    const d = new Date(si.sales?.created_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    const entry = weekMap.get(key) || { revenue: 0, cost: 0 };
    entry.cost += (productCostMap.get(si.product_id) || 0) * si.qty;
    weekMap.set(key, entry);
  });
  const marginTrend = Array.from(weekMap.entries())
    .map(([week, v]) => ({
      week,
      margin: v.revenue > 0 ? Math.round(((v.revenue - v.cost) / v.revenue) * 100) : 0,
    }))
    .sort((a, b) => {
      const parse = (str: string) => { const [d, m] = str.split(" "); return new Date(`${d} ${m} ${new Date().getFullYear()}`); };
      return parse(a.week).getTime() - parse(b.week).getTime();
    });

  // Profit by category
  const catProfitMap = new Map<string, number>();
  saleItems.forEach((si: any) => {
    const prod = products.find((p) => p.id === si.product_id);
    const cat = prod?.category || "Other";
    const profit = si.line_total - (productCostMap.get(si.product_id) || 0) * si.qty;
    catProfitMap.set(cat, (catProfitMap.get(cat) || 0) + profit);
  });
  const profitByCategory = Array.from(catProfitMap.entries())
    .map(([category, profit]) => ({ category, profit }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 7);

  // Top selling products
  const salesByProduct = new Map<string, { name: string; sold: number }>();
  saleItems.forEach((si: any) => {
    const existing = salesByProduct.get(si.product_name) || { name: si.product_name, sold: 0 };
    existing.sold += si.qty;
    salesByProduct.set(si.product_name, existing);
  });
  const topProducts = [...salesByProduct.values()].sort((a, b) => b.sold - a.sold).slice(0, 5);

  // Dead stock
  const soldProductIds = new Set(saleItems.map((si: any) => si.product_id).filter(Boolean));
  const deadStock = products.filter((p) => p.stock_qty > 0 && !soldProductIds.has(p.id)).slice(0, 5);

  // Category pie data
  const catCountMap = new Map<string, number>();
  products.forEach((p) => { const cat = p.category || "Other"; catCountMap.set(cat, (catCountMap.get(cat) || 0) + 1); });
  const categoryPieData = Array.from(catCountMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Analytics"
        subtitle="Business performance insights and intelligence"
        badge={<PlanBadge feature="advanced_analytics" />}
        actions={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <KPICard title="Total Revenue" value={formatMoney(totalRevenue, currency)} icon={<TrendingUp className="h-4 w-4" />} />
        <KPICard title="Inventory Value" value={formatMoney(inventoryValue, currency)} icon={<Package className="h-4 w-4" />} />
        <KPICard title="Avg Margin" value={`${avgMargin.toFixed(1)}%`} icon={<DollarSign className="h-4 w-4" />} variant="success" />
        <KPICard title="Outstanding" value={formatMoney(outstandingPayments, currency)} icon={<CreditCard className="h-4 w-4" />} variant={outstandingPayments > 0 ? "warning" : "default"} />
        <KPICard title="Low Stock" value={String(lowStockCount)} icon={<AlertTriangle className="h-4 w-4" />} variant={lowStockCount > 0 ? "critical" : "default"} />
        <KPICard title="Products" value={String(products.length)} icon={<BarChart3 className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="stokivo-card p-4 sm:p-5">
          <h3 className="font-display font-semibold mb-4 text-foreground">Daily Sales</h3>
          {dailySales.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,90%)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(215,15%,50%)" interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(215,15%,50%)" tickFormatter={(v) => formatMoney(v, currency)} width={70} />
                <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
                <Line type="monotone" dataKey="sales" stroke="hsl(170,60%,40%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">No sales data for this period</div>
          )}
        </div>

        <div className="stokivo-card p-4 sm:p-5">
          <h3 className="font-display font-semibold mb-4 text-foreground">Profit Margin Trend</h3>
          {marginTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={marginTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,90%)" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="hsl(215,15%,50%)" interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(215,15%,50%)" domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={40} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Line type="monotone" dataKey="margin" stroke="hsl(38,92%,50%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">No data for this period</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="stokivo-card p-4 sm:p-5">
          <h3 className="font-display font-semibold mb-4 text-foreground">Profit by Category</h3>
          {profitByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={profitByCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,90%)" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => formatMoney(v, currency)} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 10 }} width={90} />
                <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
                <Bar dataKey="profit" fill="hsl(220,60%,50%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">No sales data yet</div>
          )}
        </div>

        <div className="stokivo-card p-4 sm:p-5">
          <h3 className="font-display font-semibold mb-4 text-foreground">Products by Category</h3>
          {categoryPieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categoryPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {categoryPieData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {categoryPieData.map((c, i) => (
                  <span key={c.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />{c.name} ({c.value})
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">No products yet</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="stokivo-card p-4 sm:p-5">
          <h3 className="font-display font-semibold mb-4 text-foreground flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-warning" /> Supplier Price Changes
          </h3>
          {priceHistory.length > 0 ? (
            <div className="space-y-3">
              {priceHistory.slice(0, 6).map((ph) => {
                const product = products.find((p) => p.id === ph.product_id);
                const pctChange = ph.old_cost > 0 ? ((ph.new_cost - ph.old_cost) / ph.old_cost * 100).toFixed(1) : "0";
                const isIncrease = ph.new_cost > ph.old_cost;
                return (
                  <div key={ph.id} className={`p-3 rounded-lg border ${isIncrease ? "bg-destructive/5 border-destructive/10" : "bg-success/5 border-success/10"}`}>
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-foreground truncate">{product?.name || "Product"}</p>
                      <span className={`text-xs font-bold shrink-0 ml-2 ${isIncrease ? "text-destructive" : "text-success"}`}>
                        {isIncrease ? "+" : ""}{pctChange}%
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-1">
                      <span>Old: {formatMoney(ph.old_cost, currency)}</span>
                      <span>→ New: {formatMoney(ph.new_cost, currency)}</span>
                      <span>{new Date(ph.changed_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No supplier price changes recorded yet</p>
          )}
        </div>

        <div className="stokivo-card p-4 sm:p-5">
          <h3 className="font-display font-semibold mb-4 text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" /> Dead Stock Detection
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Products in stock with no sales this period</p>
          {deadStock.length > 0 ? (
            <div className="space-y-3">
              {deadStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.stock_qty} in stock • {formatMoney(p.cost_price * p.stock_qty, currency)} tied up</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No dead stock detected ✓</p>
          )}
        </div>
      </div>

      <div className="stokivo-card p-4 sm:p-5">
        <h3 className="font-display font-semibold mb-4 text-foreground">Top Selling Products</h3>
        {topProducts.length > 0 ? (
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3 sm:gap-4">
                <span className="text-sm font-medium text-muted-foreground w-6 shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(p.sold / topProducts[0].sold) * 100}%` }} />
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground shrink-0">{p.sold} sold</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No sales data for this period</p>
        )}
      </div>
    </div>
  );
}
