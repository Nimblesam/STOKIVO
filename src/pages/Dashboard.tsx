import { KPICard } from "@/components/KPICard";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { formatMoney } from "@/lib/currency";
import { demoProducts, demoInvoices, demoAlerts, demoCustomers } from "@/lib/demo-data";
import {
  Package, TrendingUp, AlertTriangle, FileText, DollarSign, TrendingDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { useNavigate } from "react-router-dom";

const salesData = [
  { month: "Oct", revenue: 28500 },
  { month: "Nov", revenue: 34200 },
  { month: "Dec", revenue: 41000 },
  { month: "Jan", revenue: 38700 },
  { month: "Feb", revenue: 45600 },
  { month: "Mar", revenue: 13550 },
];

const categoryData = [
  { name: "Rice & Grains", value: 35 },
  { name: "Oils & Fats", value: 20 },
  { name: "Spices", value: 18 },
  { name: "Beverages", value: 15 },
  { name: "Other", value: 12 },
];

const COLORS = [
  "hsl(170, 60%, 40%)", "hsl(220, 60%, 50%)", "hsl(38, 92%, 50%)",
  "hsl(280, 60%, 50%)", "hsl(0, 72%, 51%)",
];

export default function Dashboard() {
  const navigate = useNavigate();
  const totalStockValue = demoProducts.reduce((s, p) => s + p.costPrice * p.stockQty, 0);
  const monthlyRevenue = demoInvoices.reduce((s, inv) => s + inv.total, 0);
  const outstandingPayments = demoCustomers.reduce((s, c) => s + c.outstandingBalance, 0);
  const lowStockCount = demoProducts.filter((p) => p.stockQty <= p.minStockLevel).length;
  const priceChangeCount = demoAlerts.filter((a) => a.type === "SUPPLIER_PRICE_CHANGE").length;
  const avgMargin = demoProducts.reduce((s, p) => s + p.profitMargin, 0) / demoProducts.length;

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back, Chioma. Here's what's happening at Mama Africa Wholesale."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <KPICard
          title="Stock Value"
          value={formatMoney(totalStockValue)}
          icon={<Package className="h-4 w-4" />}
          trend={{ value: "4.2%", positive: true }}
          subtitle="vs last month"
        />
        <KPICard
          title="Monthly Revenue"
          value={formatMoney(monthlyRevenue)}
          icon={<TrendingUp className="h-4 w-4" />}
          trend={{ value: "12%", positive: true }}
          subtitle="this month"
        />
        <KPICard
          title="Profit Margin"
          value={`${avgMargin.toFixed(1)}%`}
          icon={<DollarSign className="h-4 w-4" />}
          variant="success"
        />
        <KPICard
          title="Outstanding"
          value={formatMoney(outstandingPayments)}
          icon={<FileText className="h-4 w-4" />}
          variant={outstandingPayments > 0 ? "warning" : "default"}
        />
        <KPICard
          title="Low Stock"
          value={String(lowStockCount)}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant={lowStockCount > 0 ? "critical" : "default"}
        />
        <KPICard
          title="Price Changes"
          value={String(priceChangeCount)}
          icon={<TrendingDown className="h-4 w-4" />}
          variant={priceChangeCount > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 zentra-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215, 15%, 50%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 15%, 50%)" tickFormatter={(v) => `£${v / 100}`} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Bar dataKey="revenue" fill="hsl(170, 60%, 40%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="zentra-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Sales by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {categoryData.map((c, i) => (
              <span key={c.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                {c.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="zentra-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground">Recent Invoices</h3>
            <button onClick={() => navigate("/invoices")} className="text-xs text-accent hover:underline font-medium">
              View all
            </button>
          </div>
          <div className="space-y-3">
            {demoInvoices.slice(0, 4).map((inv) => {
              const customer = demoCustomers.find((c) => c.id === inv.customerId);
              return (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/invoices`)}>
                  <div>
                    <p className="text-sm font-medium text-foreground">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">{customer?.name}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <StatusBadge status={inv.status} />
                    <span className="text-sm font-semibold text-foreground">{formatMoney(inv.total)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="zentra-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground">Active Alerts</h3>
            <button onClick={() => navigate("/alerts/low-stock")} className="text-xs text-accent hover:underline font-medium">
              View all
            </button>
          </div>
          <div className="space-y-3">
            {demoAlerts.filter((a) => !a.read).map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                  alert.severity === "critical" ? "bg-destructive/5 hover:bg-destructive/10" : "bg-warning/5 hover:bg-warning/10"
                }`}
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
