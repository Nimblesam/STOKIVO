import { PageHeader } from "@/components/PageHeader";
import { KPICard } from "@/components/KPICard";
import { formatMoney } from "@/lib/currency";
import { demoProducts, demoInvoices, demoCustomers } from "@/lib/demo-data";
import { TrendingUp, DollarSign, Package, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

const profitByCategory = [
  { category: "Rice & Grains", profit: 4200 },
  { category: "Oils & Fats", profit: 3800 },
  { category: "Spices", profit: 5600 },
  { category: "Beverages", profit: 3200 },
  { category: "Root & Tubers", profit: 2800 },
  { category: "Canned Goods", profit: 2200 },
  { category: "Flour", profit: 1900 },
];

const topProducts = [
  { name: "50kg Royal Stallion Rice", sold: 85 },
  { name: "10kg Garri (White)", sold: 72 },
  { name: "5L Red Palm Oil", sold: 60 },
  { name: "Malt Drink (Carton)", sold: 48 },
  { name: "5kg Egusi", sold: 38 },
];

const dailySales = Array.from({ length: 14 }, (_, i) => ({
  day: `Feb ${i + 15}`,
  sales: Math.floor(Math.random() * 8000 + 3000),
}));

const COLORS = ["hsl(170,60%,40%)", "hsl(220,60%,50%)", "hsl(38,92%,50%)", "hsl(280,60%,50%)", "hsl(0,72%,51%)"];

export default function Analytics() {
  const totalRevenue = demoInvoices.reduce((s, i) => s + i.total, 0);
  const totalCost = demoProducts.reduce((s, p) => s + p.costPrice * p.stockQty, 0);
  const avgMargin = demoProducts.reduce((s, p) => s + p.profitMargin, 0) / demoProducts.length;

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Analytics" subtitle="Business performance insights" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard title="Total Revenue" value={formatMoney(totalRevenue)} icon={<TrendingUp className="h-4 w-4" />} trend={{ value: "12.3%", positive: true }} />
        <KPICard title="Stock Value" value={formatMoney(totalCost)} icon={<Package className="h-4 w-4" />} />
        <KPICard title="Avg Margin" value={`${avgMargin.toFixed(1)}%`} icon={<DollarSign className="h-4 w-4" />} variant="success" />
        <KPICard title="Products" value={String(demoProducts.length)} icon={<BarChart3 className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="zentra-card p-5">
          <h3 className="font-display font-semibold mb-4">Daily Sales (Last 2 Weeks)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dailySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,90%)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(215,15%,50%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(215,15%,50%)" tickFormatter={(v) => `£${v / 100}`} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Line type="monotone" dataKey="sales" stroke="hsl(170,60%,40%)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="zentra-card p-5">
          <h3 className="font-display font-semibold mb-4">Profit by Category</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={profitByCategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,90%)" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `£${v / 100}`} />
              <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Bar dataKey="profit" fill="hsl(220,60%,50%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="zentra-card p-5">
        <h3 className="font-display font-semibold mb-4">Top Selling Products</h3>
        <div className="space-y-3">
          {topProducts.map((p, i) => (
            <div key={p.name} className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground w-6">#{i + 1}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{p.name}</p>
                <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${(p.sold / topProducts[0].sold) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-foreground">{p.sold} sold</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
