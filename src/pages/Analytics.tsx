import { PageHeader } from "@/components/PageHeader";
import { KPICard } from "@/components/KPICard";
import { formatMoney } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { demoProducts, demoInvoices, demoCustomers, demoPriceHistory } from "@/lib/demo-data";
import { TrendingUp, DollarSign, Package, BarChart3, AlertTriangle, CreditCard, TrendingDown } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import type { Currency } from "@/lib/types";

const profitByCategory = [
  { category: "Rice & Grains", profit: 4200 }, { category: "Oils & Fats", profit: 3800 },
  { category: "Spices", profit: 5600 }, { category: "Beverages", profit: 3200 },
  { category: "Root & Tubers", profit: 2800 }, { category: "Canned Goods", profit: 2200 },
  { category: "Flour", profit: 1900 },
];

const topProducts = [
  { name: "50kg Royal Stallion Rice", sold: 85 }, { name: "10kg Garri (White)", sold: 72 },
  { name: "5L Red Palm Oil", sold: 60 }, { name: "Malt Drink (Carton)", sold: 48 },
  { name: "5kg Egusi", sold: 38 },
];

const dailySales = Array.from({ length: 14 }, (_, i) => ({
  day: `Feb ${i + 15}`, sales: Math.floor(Math.random() * 8000 + 3000),
}));

const marginTrend = [
  { month: "Oct", margin: 42 }, { month: "Nov", margin: 40 }, { month: "Dec", margin: 38 },
  { month: "Jan", margin: 41 }, { month: "Feb", margin: 39 }, { month: "Mar", margin: 37 },
];

const COLORS = ["hsl(170,60%,40%)", "hsl(220,60%,50%)", "hsl(38,92%,50%)", "hsl(280,60%,50%)", "hsl(0,72%,51%)"];

export default function Analytics() {
  const { company } = useAuth();
  const currency = (company?.currency || "GBP") as Currency;

  const totalRevenue = demoInvoices.reduce((s, i) => s + i.total, 0);
  const totalCost = demoProducts.reduce((s, p) => s + p.costPrice * p.stockQty, 0);
  const avgMargin = demoProducts.reduce((s, p) => s + p.profitMargin, 0) / demoProducts.length;
  const outstandingPayments = demoCustomers.reduce((s, c) => s + c.outstandingBalance, 0);

  // Dead stock: products with no movement (simulated)
  const deadStock = demoProducts.filter((p) => p.stockQty > p.minStockLevel * 2).slice(0, 3);
  const priceChanges = demoPriceHistory.length;

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Analytics" subtitle="Business performance insights and intelligence" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
        <KPICard title="Total Revenue" value={formatMoney(totalRevenue, currency)} icon={<TrendingUp className="h-4 w-4" />} trend={{ value: "12.3%", positive: true }} />
        <KPICard title="Inventory Value" value={formatMoney(totalCost, currency)} icon={<Package className="h-4 w-4" />} />
        <KPICard title="Avg Margin" value={`${avgMargin.toFixed(1)}%`} icon={<DollarSign className="h-4 w-4" />} variant="success" />
        <KPICard title="Outstanding" value={formatMoney(outstandingPayments, currency)} icon={<CreditCard className="h-4 w-4" />} variant="warning" />
        <KPICard title="Price Changes" value={String(priceChanges)} icon={<TrendingDown className="h-4 w-4" />} variant="warning" />
        <KPICard title="Products" value={String(demoProducts.length)} icon={<BarChart3 className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="stokivo-card p-5">
          <h3 className="font-display font-semibold mb-4 text-foreground">Daily Sales (Last 2 Weeks)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dailySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,90%)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(215,15%,50%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(215,15%,50%)" tickFormatter={(v) => `£${v / 100}`} />
              <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
              <Line type="monotone" dataKey="sales" stroke="hsl(170,60%,40%)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="stokivo-card p-5">
          <h3 className="font-display font-semibold mb-4 text-foreground">Profit Margin Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={marginTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(215,15%,50%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(215,15%,50%)" domain={[30, 50]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Line type="monotone" dataKey="margin" stroke="hsl(38,92%,50%)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="stokivo-card p-5">
          <h3 className="font-display font-semibold mb-4 text-foreground">Profit by Category</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={profitByCategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,90%)" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `£${v / 100}`} />
              <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
              <Bar dataKey="profit" fill="hsl(220,60%,50%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Supplier Price Change Trends */}
        <div className="stokivo-card p-5">
          <h3 className="font-display font-semibold mb-4 text-foreground flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-warning" /> Supplier Price Changes
          </h3>
          <div className="space-y-3">
            {demoPriceHistory.map((ph) => {
              const product = demoProducts.find((p) => p.id === ph.productId);
              const pctChange = ((ph.newCost - ph.oldCost) / ph.oldCost * 100).toFixed(1);
              const isIncrease = ph.newCost > ph.oldCost;
              return (
                <div key={ph.id} className={`p-3 rounded-lg border ${isIncrease ? "bg-destructive/5 border-destructive/10" : "bg-success/5 border-success/10"}`}>
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-foreground">{product?.name || "Product"}</p>
                    <span className={`text-xs font-bold ${isIncrease ? "text-destructive" : "text-success"}`}>
                      {isIncrease ? "+" : ""}{pctChange}%
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                    <span>Old: {formatMoney(ph.oldCost, currency)}</span>
                    <span>→ New: {formatMoney(ph.newCost, currency)}</span>
                    <span>{ph.changedAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="stokivo-card p-5">
          <h3 className="font-display font-semibold mb-4 text-foreground">Top Selling Products</h3>
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-4">
                <span className="text-sm font-medium text-muted-foreground w-6">#{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(p.sold / topProducts[0].sold) * 100}%` }} />
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground">{p.sold} sold</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dead Stock Detection */}
        <div className="stokivo-card p-5">
          <h3 className="font-display font-semibold mb-4 text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" /> Dead Stock Detection
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Products with excess stock relative to demand</p>
          <div className="space-y-3">
            {deadStock.map((p) => {
              const excessRatio = (p.stockQty / p.minStockLevel).toFixed(1);
              return (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.stockQty} in stock (min: {p.minStockLevel})</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{excessRatio}x</p>
                    <p className="text-[10px] text-muted-foreground">above min</p>
                  </div>
                </div>
              );
            })}
            {deadStock.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No dead stock detected ✓</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
