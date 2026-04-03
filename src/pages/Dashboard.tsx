import { useState, useEffect } from "react";
import { LowStockNotification } from "@/components/LowStockNotification";
import { TwoFactorReminder } from "@/components/TwoFactorSetup";
import { DailyEarningsSummary } from "@/components/DailyEarningsSummary";
import { SmartSuggestions } from "@/components/SmartSuggestions";
import { KPICard } from "@/components/KPICard";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { formatMoney } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Package, TrendingUp, AlertTriangle, DollarSign, TrendingDown, CreditCard, Users, RefreshCw, ShoppingBag, Loader2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useNavigate } from "react-router-dom";
import type { Currency } from "@/lib/types";

const COLORS = ["hsl(170,60%,40%)", "hsl(220,60%,50%)", "hsl(38,92%,50%)", "hsl(280,60%,50%)", "hsl(0,72%,51%)"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, company } = useAuth();
  const currency = (company?.currency || "GBP") as Currency;
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.company_id) return;
    const cid = profile.company_id;
    setLoading(true);
    Promise.all([
      supabase.from("products").select("*").eq("company_id", cid),
      supabase.from("customers").select("*").eq("company_id", cid),
      supabase.from("invoices").select("*, customers(name)").eq("company_id", cid).order("created_at", { ascending: false }).limit(10),
      supabase.from("alerts").select("*").eq("company_id", cid).eq("read", false).order("created_at", { ascending: false }).limit(10),
      supabase.from("sales").select("total, created_at").eq("company_id", cid),
    ]).then(([p, c, i, a, s]) => {
      setProducts(p.data || []);
      setCustomers(c.data || []);
      setInvoices(i.data || []);
      setAlerts(a.data || []);
      setSales(s.data || []);
      setLoading(false);
    });
  }, [profile?.company_id]);

  const totalStockValue = products.reduce((s, p) => s + p.cost_price * p.stock_qty, 0);
  const monthlyRevenue = sales.reduce((s, sale) => s + sale.total, 0);
  const outstandingPayments = customers.reduce((s, c) => s + c.outstanding_balance, 0);
  const lowStockCount = products.filter((p) => p.stock_qty <= p.min_stock_level && p.min_stock_level > 0).length;
  const priceChangeCount = alerts.filter((a) => a.type === "SUPPLIER_PRICE_CHANGE").length;
  const avgMargin = products.length > 0
    ? products.reduce((s, p) => s + (p.profit_margin || 0), 0) / products.length
    : 0;

  const criticalStock = products
    .filter((p) => p.stock_qty <= p.min_stock_level && p.min_stock_level > 0)
    .sort((a, b) => (a.stock_qty / a.min_stock_level) - (b.stock_qty / b.min_stock_level))
    .slice(0, 5);

  const topDebtors = customers
    .filter((c) => c.outstanding_balance > 0)
    .sort((a, b) => b.outstanding_balance - a.outstanding_balance)
    .slice(0, 4);

  // Build category data from products
  const catMap = new Map<string, number>();
  products.forEach((p) => {
    const cat = p.category || "Other";
    catMap.set(cat, (catMap.get(cat) || 0) + 1);
  });
  const categoryData = Array.from(catMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Build revenue chart from sales
  const monthMap = new Map<string, number>();
  sales.forEach((s) => {
    const d = new Date(s.created_at);
    const key = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
    monthMap.set(key, (monthMap.get(key) || 0) + s.total);
  });
  const salesData = Array.from(monthMap.entries()).map(([month, revenue]) => ({ month, revenue })).slice(-6);

  // Reorder suggestions
  const reorderSuggestions = products
    .filter((p) => p.stock_qty <= p.min_stock_level * 1.5 && p.min_stock_level > 0)
    .map((p) => {
      const suggestedQty = Math.max(p.min_stock_level * 2 - p.stock_qty, p.min_stock_level);
      return { ...p, suggestedQty, restockCost: suggestedQty * p.cost_price };
    })
    .sort((a, b) => (a.stock_qty / a.min_stock_level) - (b.stock_qty / b.min_stock_level));

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <TwoFactorReminder />
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back${profile?.full_name ? `, ${profile.full_name}` : ""}. Here's your business overview.`}
      />

      <LowStockNotification />
      <DailyEarningsSummary />
      <SmartSuggestions />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <KPICard title="Stock Value" value={formatMoney(totalStockValue, currency)} icon={<Package className="h-4 w-4" />} subtitle={`${products.length} products`} />
        <KPICard title="Sales Revenue" value={formatMoney(monthlyRevenue, currency)} icon={<TrendingUp className="h-4 w-4" />} subtitle={`${sales.length} sales`} />
        <KPICard title="Profit Margin" value={`${avgMargin.toFixed(1)}%`} icon={<DollarSign className="h-4 w-4" />} variant="success" />
        <KPICard title="Credit Owed" value={formatMoney(outstandingPayments, currency)} icon={<CreditCard className="h-4 w-4" />} variant={outstandingPayments > 0 ? "warning" : "default"} />
        <KPICard title="Low Stock" value={String(lowStockCount)} icon={<AlertTriangle className="h-4 w-4" />} variant={lowStockCount > 0 ? "critical" : "default"} />
        <KPICard title="Price Changes" value={String(priceChangeCount)} icon={<TrendingDown className="h-4 w-4" />} variant={priceChangeCount > 0 ? "warning" : "default"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 stokivo-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Revenue Trend</h3>
          {salesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215,15%,50%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(215,15%,50%)" tickFormatter={(v) => formatMoney(v, currency)} />
                <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
                <Bar dataKey="revenue" fill="hsl(170,60%,40%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No sales data yet</div>
          )}
        </div>

        <div className="stokivo-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Products by Category</h3>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {categoryData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2">
                {categoryData.map((c, i) => (
                  <span key={c.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />{c.name}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">No products yet</div>
          )}
        </div>
      </div>

      {/* Reorder Suggestions + Critical Stock + Credit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="stokivo-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-accent" /> Reorder Suggestions
            </h3>
          </div>
          <div className="space-y-3">
            {reorderSuggestions.slice(0, 5).map((p) => (
              <div key={p.id} className="p-3 rounded-lg bg-muted/30 space-y-1.5">
                <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                  <div>Stock: <span className={`font-semibold ${p.stock_qty <= p.min_stock_level * 0.5 ? "text-destructive" : "text-warning-foreground"}`}>{p.stock_qty}</span></div>
                  <div>Reorder: <span className="font-semibold text-accent">{p.suggestedQty}</span></div>
                </div>
                <p className="text-[10px] text-muted-foreground">Est. cost: {formatMoney(p.restockCost, currency)}</p>
              </div>
            ))}
            {reorderSuggestions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">All stock levels healthy ✓</p>}
          </div>
        </div>

        <div className="stokivo-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Critical Stock
            </h3>
            <button onClick={() => navigate("/alerts/low-stock")} className="text-xs text-accent hover:underline font-medium">View all</button>
          </div>
          <div className="space-y-3">
            {criticalStock.map((p) => {
              const pct = Math.round((p.stock_qty / p.min_stock_level) * 100);
              const isCritical = p.stock_qty <= p.min_stock_level * 0.5;
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isCritical ? "bg-destructive/10" : "bg-warning/10"}`}>
                    <Package className={`h-3.5 w-3.5 ${isCritical ? "text-destructive" : "text-warning"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <span className={`text-xs font-bold ml-2 ${isCritical ? "text-destructive" : "text-warning"}`}>{p.stock_qty}/{p.min_stock_level}</span>
                    </div>
                    <Progress value={pct} className={`h-1.5 mt-1 ${isCritical ? "[&>div]:bg-destructive" : "[&>div]:bg-warning"}`} />
                  </div>
                </div>
              );
            })}
            {criticalStock.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">All stock healthy ✓</p>}
          </div>
        </div>

        <div className="stokivo-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-warning" /> Outstanding Payments
            </h3>
            <button onClick={() => navigate("/credit-ledger")} className="text-xs text-accent hover:underline font-medium">View ledger</button>
          </div>
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/10 mb-3">
            <p className="text-xs text-muted-foreground">Total Outstanding</p>
            <p className="text-xl font-display font-bold text-destructive">{formatMoney(outstandingPayments, currency)}</p>
          </div>
          <div className="space-y-2">
            {topDebtors.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate("/credit-ledger")}>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-destructive/10 flex items-center justify-center">
                    <Users className="h-3 w-3 text-destructive" />
                  </div>
                  <p className="text-xs font-medium text-foreground">{c.name}</p>
                </div>
                <span className="text-xs font-bold text-destructive">{formatMoney(c.outstanding_balance, currency)}</span>
              </div>
            ))}
            {topDebtors.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No outstanding debts ✓</p>}
          </div>
        </div>
      </div>

      {/* Recent Invoices + Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="stokivo-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground">Recent Invoices</h3>
            <button onClick={() => navigate("/invoices")} className="text-xs text-accent hover:underline font-medium">View all</button>
          </div>
          <div className="space-y-3">
            {invoices.slice(0, 4).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate("/invoices")}>
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.invoice_number}</p>
                  <p className="text-xs text-muted-foreground">{(inv as any).customers?.name || "—"}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <StatusBadge status={inv.status} />
                  <span className="text-sm font-semibold text-foreground">{formatMoney(inv.total, currency)}</span>
                </div>
              </div>
            ))}
            {invoices.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No invoices yet</p>}
          </div>
        </div>

        <div className="stokivo-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground">Active Alerts</h3>
            <button onClick={() => navigate("/alerts/low-stock")} className="text-xs text-accent hover:underline font-medium">View all</button>
          </div>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer ${alert.severity === "critical" ? "bg-destructive/5 hover:bg-destructive/10" : "bg-warning/5 hover:bg-warning/10"}`}
                onClick={() => navigate(alert.type === "LOW_STOCK" ? "/alerts/low-stock" : "/alerts/price-changes")}
              >
                <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${alert.severity === "critical" ? "text-destructive" : "text-warning"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{alert.product_name || "Alert"}</p>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                </div>
                <StatusBadge status={alert.severity} className="ml-auto shrink-0" />
              </div>
            ))}
            {alerts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No active alerts ✓</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
