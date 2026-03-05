import { useState, useEffect } from "react";
import { KPICard } from "@/components/KPICard";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { formatMoney } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { demoProducts, demoInvoices, demoAlerts, demoCustomers } from "@/lib/demo-data";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Package, TrendingUp, AlertTriangle, DollarSign, TrendingDown, CreditCard, Users, RefreshCw, ShoppingBag,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useNavigate } from "react-router-dom";
import type { Currency } from "@/lib/types";

const salesData = [
  { month: "Oct", revenue: 28500 }, { month: "Nov", revenue: 34200 }, { month: "Dec", revenue: 41000 },
  { month: "Jan", revenue: 38700 }, { month: "Feb", revenue: 45600 }, { month: "Mar", revenue: 13550 },
];

const categoryData = [
  { name: "Rice & Grains", value: 35 }, { name: "Oils & Fats", value: 20 },
  { name: "Spices", value: 18 }, { name: "Beverages", value: 15 }, { name: "Other", value: 12 },
];

const COLORS = ["hsl(170,60%,40%)", "hsl(220,60%,50%)", "hsl(38,92%,50%)", "hsl(280,60%,50%)", "hsl(0,72%,51%)"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, company } = useAuth();
  const currency = (company?.currency || "GBP") as Currency;
  const [reorderSuggestions, setReorderSuggestions] = useState<any[]>([]);

  // Compute reorder suggestions from demo data (would be live data)
  useEffect(() => {
    const suggestions = demoProducts
      .filter((p) => p.stockQty <= p.minStockLevel * 1.5)
      .map((p) => {
        const avgWeeklySales = Math.max(5, Math.floor(Math.random() * 20 + 5)); // mock
        const suggestedQty = Math.max(p.minStockLevel * 2 - p.stockQty, avgWeeklySales * 2);
        return { ...p, avgWeeklySales, suggestedQty, restockCost: suggestedQty * p.costPrice };
      })
      .sort((a, b) => (a.stockQty / a.minStockLevel) - (b.stockQty / b.minStockLevel));
    setReorderSuggestions(suggestions);
  }, []);

  const totalStockValue = demoProducts.reduce((s, p) => s + p.costPrice * p.stockQty, 0);
  const monthlyRevenue = demoInvoices.reduce((s, inv) => s + inv.total, 0);
  const outstandingPayments = demoCustomers.reduce((s, c) => s + c.outstandingBalance, 0);
  const lowStockCount = demoProducts.filter((p) => p.stockQty <= p.minStockLevel).length;
  const priceChangeCount = demoAlerts.filter((a) => a.type === "SUPPLIER_PRICE_CHANGE").length;
  const avgMargin = demoProducts.reduce((s, p) => s + p.profitMargin, 0) / demoProducts.length;

  const criticalStock = demoProducts
    .filter((p) => p.stockQty <= p.minStockLevel)
    .sort((a, b) => (a.stockQty / a.minStockLevel) - (b.stockQty / b.minStockLevel))
    .slice(0, 5);

  const topDebtors = demoCustomers
    .filter((c) => c.outstandingBalance > 0)
    .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back${profile?.full_name ? `, ${profile.full_name}` : ""}. Here's your business overview.`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <KPICard title="Stock Value" value={formatMoney(totalStockValue, currency)} icon={<Package className="h-4 w-4" />} trend={{ value: "4.2%", positive: true }} subtitle="vs last month" />
        <KPICard title="Monthly Revenue" value={formatMoney(monthlyRevenue, currency)} icon={<TrendingUp className="h-4 w-4" />} trend={{ value: "12%", positive: true }} subtitle="this month" />
        <KPICard title="Profit Margin" value={`${avgMargin.toFixed(1)}%`} icon={<DollarSign className="h-4 w-4" />} variant="success" />
        <KPICard title="Credit Owed" value={formatMoney(outstandingPayments, currency)} icon={<CreditCard className="h-4 w-4" />} variant={outstandingPayments > 0 ? "warning" : "default"} />
        <KPICard title="Low Stock" value={String(lowStockCount)} icon={<AlertTriangle className="h-4 w-4" />} variant={lowStockCount > 0 ? "critical" : "default"} />
        <KPICard title="Price Changes" value={String(priceChangeCount)} icon={<TrendingDown className="h-4 w-4" />} variant={priceChangeCount > 0 ? "warning" : "default"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 zentra-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215,15%,50%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(215,15%,50%)" tickFormatter={(v) => `£${v / 100}`} />
              <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
              <Bar dataKey="revenue" fill="hsl(170,60%,40%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="zentra-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Sales by Category</h3>
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
        </div>
      </div>

      {/* Reorder Suggestions + Critical Stock + Credit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Reorder Suggestions */}
        <div className="zentra-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-accent" /> Reorder Suggestions
            </h3>
          </div>
          <div className="space-y-3">
            {reorderSuggestions.slice(0, 5).map((p) => (
              <div key={p.id} className="p-3 rounded-lg bg-muted/30 space-y-1.5">
                <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                <div className="grid grid-cols-3 gap-1 text-[11px] text-muted-foreground">
                  <div>Stock: <span className={`font-semibold ${p.stockQty <= p.minStockLevel * 0.5 ? "text-destructive" : "text-warning-foreground"}`}>{p.stockQty}</span></div>
                  <div>Avg/wk: <span className="font-semibold text-foreground">{p.avgWeeklySales}</span></div>
                  <div>Reorder: <span className="font-semibold text-accent">{p.suggestedQty}</span></div>
                </div>
                <p className="text-[10px] text-muted-foreground">Est. cost: {formatMoney(p.restockCost, currency)}</p>
              </div>
            ))}
            {reorderSuggestions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">All stock levels healthy ✓</p>}
          </div>
        </div>

        {/* Critical Stock */}
        <div className="zentra-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Critical Stock
            </h3>
            <button onClick={() => navigate("/alerts/low-stock")} className="text-xs text-accent hover:underline font-medium">View all</button>
          </div>
          <div className="space-y-3">
            {criticalStock.map((p) => {
              const pct = Math.round((p.stockQty / p.minStockLevel) * 100);
              const isCritical = p.stockQty <= p.minStockLevel * 0.5;
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isCritical ? "bg-destructive/10" : "bg-warning/10"}`}>
                    <Package className={`h-3.5 w-3.5 ${isCritical ? "text-destructive" : "text-warning"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <span className={`text-xs font-bold ml-2 ${isCritical ? "text-destructive" : "text-warning"}`}>{p.stockQty}/{p.minStockLevel}</span>
                    </div>
                    <Progress value={pct} className={`h-1.5 mt-1 ${isCritical ? "[&>div]:bg-destructive" : "[&>div]:bg-warning"}`} />
                  </div>
                </div>
              );
            })}
            {criticalStock.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">All stock healthy ✓</p>}
          </div>
        </div>

        {/* Credit / Debtors */}
        <div className="zentra-card p-5">
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
            {topDebtors.map((c) => {
              const hasOverdue = demoInvoices.some((i) => i.customerId === c.id && i.status === "overdue");
              return (
                <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate("/credit-ledger")}>
                  <div className="flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center ${hasOverdue ? "bg-destructive/10" : "bg-accent/10"}`}>
                      <Users className={`h-3 w-3 ${hasOverdue ? "text-destructive" : "text-accent"}`} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{c.name}</p>
                      {hasOverdue && <span className="text-[9px] text-destructive font-medium">OVERDUE</span>}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-destructive">{formatMoney(c.outstandingBalance, currency)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Invoices + Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="zentra-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground">Recent Invoices</h3>
            <button onClick={() => navigate("/invoices")} className="text-xs text-accent hover:underline font-medium">View all</button>
          </div>
          <div className="space-y-3">
            {demoInvoices.slice(0, 4).map((inv) => {
              const customer = demoCustomers.find((c) => c.id === inv.customerId);
              return (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate("/invoices")}>
                  <div>
                    <p className="text-sm font-medium text-foreground">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">{customer?.name}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <StatusBadge status={inv.status} />
                    <span className="text-sm font-semibold text-foreground">{formatMoney(inv.total, currency)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="zentra-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground">Active Alerts</h3>
            <button onClick={() => navigate("/alerts/low-stock")} className="text-xs text-accent hover:underline font-medium">View all</button>
          </div>
          <div className="space-y-3">
            {demoAlerts.filter((a) => !a.read).map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer ${alert.severity === "critical" ? "bg-destructive/5 hover:bg-destructive/10" : "bg-warning/5 hover:bg-warning/10"}`}
                onClick={() => navigate(alert.type === "LOW_STOCK" ? "/alerts/low-stock" : "/alerts/price-changes")}
              >
                <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${alert.severity === "critical" ? "text-destructive" : "text-warning"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{alert.productName}</p>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                </div>
                <StatusBadge status={alert.severity} className="ml-auto shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
