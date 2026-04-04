import { PageHeader } from "@/components/PageHeader";
import { PlanBadge } from "@/components/PlanBadge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatMoney } from "@/lib/currency";
import {
  Brain, TrendingUp, TrendingDown, Minus, Loader2, Package, BarChart3, AlertTriangle, Lightbulb,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { Currency } from "@/lib/types";

export default function AIInsights() {
  const { profile, company } = useAuth();
  const currency = (company?.currency || "GBP") as Currency;
  const [products, setProducts] = useState<any[]>([]);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.company_id) return;
    const cid = profile.company_id;
    setLoading(true);
    Promise.all([
      supabase.from("products").select("*").eq("company_id", cid),
      supabase.from("sale_items").select("product_id, product_name, qty, sale_id, sales!inner(created_at, company_id)").eq("sales.company_id", cid),
    ]).then(([p, si]) => {
      setProducts(p.data || []);
      setSaleItems(si.data || []);
      setLoading(false);
    });
  }, [profile?.company_id]);

  // Calculate demand forecasts per product
  const forecasts = useMemo(() => {
    if (products.length === 0) return [];

    const salesByProduct = new Map<string, { dates: Date[]; totalQty: number }>();

    saleItems.forEach((si: any) => {
      const date = new Date((si.sales as any)?.created_at || si.created_at);
      const existing = salesByProduct.get(si.product_id);
      if (existing) {
        existing.dates.push(date);
        existing.totalQty += si.qty;
      } else {
        salesByProduct.set(si.product_id, { dates: [date], totalQty: si.qty });
      }
    });

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    return products.map((p) => {
      const data = salesByProduct.get(p.id);
      if (!data || data.totalQty === 0) {
        return {
          ...p,
          avgDailySales: 0,
          predictedNext7Days: 0,
          trend: "stable" as const,
          trendPercent: 0,
          recommendedStock: p.min_stock_level || 10,
          confidence: "low",
        };
      }

      const daysOfData = Math.max(1, Math.ceil((now.getTime() - Math.min(...data.dates.map(d => d.getTime()))) / (1000 * 60 * 60 * 24)));
      const avgDailySales = data.totalQty / daysOfData;

      // Recent vs older sales for trend
      const recentSales = data.dates.filter(d => d >= sevenDaysAgo).length;
      const olderSales = data.dates.filter(d => d >= fourteenDaysAgo && d < sevenDaysAgo).length;

      let trend: "up" | "down" | "stable" = "stable";
      let trendPercent = 0;
      if (olderSales > 0) {
        trendPercent = Math.round(((recentSales - olderSales) / olderSales) * 100);
        if (trendPercent > 15) trend = "up";
        else if (trendPercent < -15) trend = "down";
      } else if (recentSales > 0) {
        trend = "up";
        trendPercent = 100;
      }

      const predictedNext7Days = Math.round(avgDailySales * 7);
      const recommendedStock = Math.ceil(avgDailySales * 14) + (p.min_stock_level || 0);

      return {
        ...p,
        avgDailySales: Math.round(avgDailySales * 10) / 10,
        predictedNext7Days,
        trend,
        trendPercent,
        recommendedStock,
        confidence: daysOfData > 30 ? "high" : daysOfData > 7 ? "medium" : "low",
      };
    })
    .filter((p) => p.avgDailySales > 0 || p.stock_qty > 0)
    .sort((a, b) => b.avgDailySales - a.avgDailySales);
  }, [products, saleItems]);

  // Chart data: top 10 products by predicted demand
  const chartData = useMemo(() => {
    return forecasts
      .filter(f => f.predictedNext7Days > 0)
      .slice(0, 10)
      .map(f => ({
        name: f.name.length > 15 ? f.name.slice(0, 15) + "…" : f.name,
        predicted: f.predictedNext7Days,
        stock: f.stock_qty,
      }));
  }, [forecasts]);

  // Summary stats
  const understocked = forecasts.filter(f => f.stock_qty < f.recommendedStock && f.avgDailySales > 0);
  const trendingUp = forecasts.filter(f => f.trend === "up");
  const trendingDown = forecasts.filter(f => f.trend === "down");

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="AI Insights"
        subtitle="Demand predictions and stock recommendations powered by your sales data"
        badge={<PlanBadge feature="ai_insights" />}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="stokivo-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Brain className="h-4 w-4 text-primary" /> Products Analyzed
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{forecasts.length}</p>
        </div>
        <div className="stokivo-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4 text-accent" /> Trending Up
          </div>
          <p className="text-2xl font-display font-bold text-accent">{trendingUp.length}</p>
        </div>
        <div className="stokivo-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingDown className="h-4 w-4 text-warning" /> Trending Down
          </div>
          <p className="text-2xl font-display font-bold text-warning">{trendingDown.length}</p>
        </div>
        <div className="stokivo-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Understocked
          </div>
          <p className="text-2xl font-display font-bold text-destructive">{understocked.length}</p>
        </div>
      </div>

      {/* Demand Chart */}
      {chartData.length > 0 && (
        <div className="stokivo-card p-4 sm:p-5 mb-6">
          <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> 7-Day Demand Forecast vs Current Stock
          </h3>
          <div className="overflow-x-auto">
            <ResponsiveContainer width="100%" height={280} minWidth={400}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(215,15%,50%)" angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(215,15%,50%)" />
                <Tooltip />
                <Bar dataKey="predicted" name="Predicted Demand" fill="hsl(280,60%,50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="stock" name="Current Stock" fill="hsl(170,60%,40%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Product Forecasts */}
      <div className="stokivo-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" /> Product Demand Predictions
          </h3>
        </div>
        {forecasts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Brain className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>No sales data to analyze yet</p>
            <p className="text-sm mt-1">Start recording sales to unlock AI-powered insights</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-5">
            {forecasts.slice(0, 12).map((f) => {
              const TrendIcon = f.trend === "up" ? TrendingUp : f.trend === "down" ? TrendingDown : Minus;
              const trendColor = f.trend === "up" ? "text-accent" : f.trend === "down" ? "text-destructive" : "text-muted-foreground";
              const stockHealth = f.stock_qty >= f.recommendedStock ? "healthy" : f.stock_qty >= f.recommendedStock * 0.5 ? "low" : "critical";

              return (
                <div key={f.id} className="p-3 rounded-xl border bg-card space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{f.name}</p>
                      <p className="text-[11px] text-muted-foreground">{f.category || "Uncategorized"}</p>
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
                      <TrendIcon className="h-3.5 w-3.5" />
                      {f.trend === "stable" ? "Stable" : `${Math.abs(f.trendPercent)}%`}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-1.5 rounded-lg bg-muted/50">
                      <p className="text-[10px] text-muted-foreground">Avg/Day</p>
                      <p className="text-sm font-bold text-foreground">{f.avgDailySales}</p>
                    </div>
                    <div className="p-1.5 rounded-lg bg-primary/5">
                      <p className="text-[10px] text-muted-foreground">Next 7d</p>
                      <p className="text-sm font-bold text-primary">{f.predictedNext7Days}</p>
                    </div>
                    <div className="p-1.5 rounded-lg bg-muted/50">
                      <p className="text-[10px] text-muted-foreground">Stock</p>
                      <p className={`text-sm font-bold ${stockHealth === "critical" ? "text-destructive" : stockHealth === "low" ? "text-warning" : "text-accent"}`}>{f.stock_qty}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Recommended: <span className="font-semibold text-foreground">{f.recommendedStock}</span></span>
                    <Badge variant="outline" className="text-[10px] capitalize">{f.confidence}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
