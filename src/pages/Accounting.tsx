import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatMoney } from "@/lib/currency";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, TrendingUp, TrendingDown, DollarSign, Package, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { Currency } from "@/lib/types";

export default function Accounting() {
  const { profile, company } = useAuth();
  const currency = (company?.currency || "GBP") as Currency;
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const [sales, setSales] = useState<any[]>([]);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

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
      supabase.from("products").select("id, name, cost_price, selling_price, stock_qty").eq("company_id", cid),
    ]).then(([sRes, siRes, pRes]) => {
      setSales(sRes.data || []);
      setSaleItems(siRes.data || []);
      setProducts(pRes.data || []);
      setLoading(false);
    });
  }, [profile?.company_id, period]);

  const totalRevenue = sales.reduce((s, r) => s + r.total, 0);

  // Calculate COGS from sale items + product cost prices
  const productCostMap = new Map(products.map((p) => [p.id, p.cost_price]));
  const totalCOGS = saleItems.reduce((s, si) => {
    const cost = productCostMap.get(si.product_id) || 0;
    return s + cost * si.qty;
  }, 0);

  const grossProfit = totalRevenue - totalCOGS;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100).toFixed(1) : "0.0";
  const inventoryValue = products.reduce((s, p) => s + p.cost_price * p.stock_qty, 0);
  const retailValue = products.reduce((s, p) => s + p.selling_price * p.stock_qty, 0);

  // Daily breakdown for chart
  const dailyMap = new Map<string, { revenue: number; cost: number }>();
  sales.forEach((s) => {
    const day = new Date(s.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    const entry = dailyMap.get(day) || { revenue: 0, cost: 0 };
    entry.revenue += s.total;
    dailyMap.set(day, entry);
  });
  saleItems.forEach((si: any) => {
    const day = new Date(si.sales?.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    const entry = dailyMap.get(day) || { revenue: 0, cost: 0 };
    entry.cost += (productCostMap.get(si.product_id) || 0) * si.qty;
    dailyMap.set(day, entry);
  });
  const chartData = Array.from(dailyMap.entries())
    .map(([day, v]) => ({ day, revenue: v.revenue, cost: v.cost, profit: v.revenue - v.cost }))
    .sort((a, b) => {
      const parseDate = (str: string) => {
        const [d, m] = str.split(" ");
        return new Date(`${d} ${m} ${new Date().getFullYear()}`);
      };
      return parseDate(a.day).getTime() - parseDate(b.day).getTime();
    });

  // Top products by profit
  const productProfitMap = new Map<string, { revenue: number; cost: number; qty: number }>();
  saleItems.forEach((si: any) => {
    const key = si.product_name;
    const entry = productProfitMap.get(key) || { revenue: 0, cost: 0, qty: 0 };
    entry.revenue += si.line_total;
    entry.cost += (productCostMap.get(si.product_id) || 0) * si.qty;
    entry.qty += si.qty;
    productProfitMap.set(key, entry);
  });
  const topProducts = [...productProfitMap.entries()]
    .map(([name, v]) => ({ name, ...v, profit: v.revenue - v.cost }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 8);

  const exportCSV = () => {
    const rows = [
      ["Date", "Revenue", "Cost of Goods", "Gross Profit"],
      ...chartData.map((d) => [d.day, (d.revenue / 100).toFixed(2), (d.cost / 100).toFixed(2), (d.profit / 100).toFixed(2)]),
      [],
      ["Summary"],
      ["Total Revenue", (totalRevenue / 100).toFixed(2)],
      ["Total COGS", (totalCOGS / 100).toFixed(2)],
      ["Gross Profit", (grossProfit / 100).toFixed(2)],
      ["Gross Margin %", grossMargin],
      ["Inventory Value (Cost)", (inventoryValue / 100).toFixed(2)],
      ["Inventory Value (Retail)", (retailValue / 100).toFixed(2)],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stokivo-accounting-${period}days.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Accounting"
        subtitle="Profit & loss overview with exportable reports"
        actions={
          <div className="flex items-center gap-3">
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
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-xl font-display font-bold text-foreground">{formatMoney(totalRevenue, currency)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <ArrowDownRight className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cost of Goods</p>
              <p className="text-xl font-display font-bold text-foreground">{formatMoney(totalCOGS, currency)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gross Profit</p>
              <p className={`text-xl font-display font-bold ${grossProfit >= 0 ? "text-success" : "text-destructive"}`}>
                {formatMoney(grossProfit, currency)}
              </p>
              <p className="text-[11px] text-muted-foreground">{grossMargin}% margin</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Inventory Value</p>
              <p className="text-xl font-display font-bold text-foreground">{formatMoney(inventoryValue, currency)}</p>
              <p className="text-[11px] text-muted-foreground">Retail: {formatMoney(retailValue, currency)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue vs Cost Chart */}
      <Card className="p-4 sm:p-5 mb-6 sm:mb-8">
        <h3 className="font-display font-semibold text-foreground mb-4">Revenue vs Cost of Goods</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,90%)" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(215,15%,50%)" interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(215,15%,50%)" tickFormatter={(v) => formatMoney(v, currency)} width={65} />
              <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="hsl(170,60%,40%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="cost" name="COGS" fill="hsl(0,72%,51%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="profit" name="Profit" fill="hsl(142,60%,40%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">No sales data for this period</div>
        )}
      </Card>

      {/* Top Products by Profit */}
      <Card className="p-5">
        <h3 className="font-display font-semibold text-foreground mb-4">Top Products by Profit</h3>
        {topProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium text-right">Qty Sold</th>
                  <th className="pb-2 font-medium text-right">Revenue</th>
                  <th className="pb-2 font-medium text-right">COGS</th>
                  <th className="pb-2 font-medium text-right">Profit</th>
                  <th className="pb-2 font-medium text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => {
                  const margin = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={p.name} className="border-b last:border-0">
                      <td className="py-2.5 font-medium text-foreground">{p.name}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{p.qty}</td>
                      <td className="py-2.5 text-right">{formatMoney(p.revenue, currency)}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{formatMoney(p.cost, currency)}</td>
                      <td className={`py-2.5 text-right font-semibold ${p.profit >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatMoney(p.profit, currency)}
                      </td>
                      <td className="py-2.5 text-right text-muted-foreground">{margin}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No sales data for this period</p>
        )}
      </Card>
    </div>
  );
}
