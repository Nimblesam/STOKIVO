import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatMoney } from "@/lib/currency";
import { Lightbulb, TrendingUp, TrendingDown, Package, AlertTriangle, Star } from "lucide-react";
import type { Currency } from "@/lib/types";

interface Suggestion {
  id: string;
  icon: typeof Lightbulb;
  message: string;
  type: "info" | "warning" | "success";
}

export function SmartSuggestions() {
  const { profile, company } = useAuth();
  const currency = (company?.currency || "GBP") as Currency;
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (!profile?.company_id) return;
    const cid = profile.company_id!;

    Promise.all([
      supabase.from("products").select("id, name, stock_qty, min_stock_level, selling_price, cost_price").eq("company_id", cid),
      supabase.from("sale_items").select("product_name, qty, sale_id, sales!inner(company_id, created_at)")
        .eq("sales.company_id", cid),
      supabase.from("sales").select("total, created_at").eq("company_id", cid),
    ]).then(([prodRes, saleItemsRes, salesRes]) => {
      const products = prodRes.data || [];
      const saleItems = saleItemsRes.data || [];
      const allSales = salesRes.data || [];
      const tips: Suggestion[] = [];

      // Top selling product
      const salesByProduct = new Map<string, number>();
      saleItems.forEach((si: any) => {
        salesByProduct.set(si.product_name, (salesByProduct.get(si.product_name) || 0) + si.qty);
      });
      const topProduct = [...salesByProduct.entries()].sort((a, b) => b[1] - a[1])[0];
      if (topProduct) {
        tips.push({
          id: "top-seller",
          icon: Star,
          message: `"${topProduct[0]}" is your top-selling item with ${topProduct[1]} units sold. Keep it well stocked!`,
          type: "success",
        });
      }

      // Fast-selling items that need restock
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);
      const recentItems = saleItems.filter((si: any) => new Date(si.sales?.created_at) >= last7Days);
      const recentByProduct = new Map<string, number>();
      recentItems.forEach((si: any) => {
        recentByProduct.set(si.product_name, (recentByProduct.get(si.product_name) || 0) + si.qty);
      });

      products.forEach((p) => {
        const weeklyRate = recentByProduct.get(p.name) || 0;
        if (weeklyRate > 0 && p.stock_qty > 0) {
          const weeksLeft = p.stock_qty / weeklyRate;
          if (weeksLeft <= 2 && p.stock_qty > p.min_stock_level) {
            tips.push({
              id: `fast-${p.id}`,
              icon: TrendingUp,
              message: `"${p.name}" is selling fast — only ~${Math.ceil(weeksLeft)} week${weeksLeft > 1 ? "s" : ""} of stock left. Restock soon.`,
              type: "warning",
            });
          }
        }
      });

      // Sales trend (today vs yesterday)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const todaySales = allSales.filter((s) => new Date(s.created_at) >= today);
      const yesterdaySales = allSales.filter((s) => {
        const d = new Date(s.created_at);
        return d >= yesterday && d < today;
      });
      const todayRev = todaySales.reduce((s, r) => s + r.total, 0);
      const yesterdayRev = yesterdaySales.reduce((s, r) => s + r.total, 0);

      if (yesterdayRev > 0 && todayRev < yesterdayRev * 0.5 && todaySales.length > 0) {
        tips.push({
          id: "sales-drop",
          icon: TrendingDown,
          message: `Sales are down today compared to yesterday. Consider running a promotion to boost activity.`,
          type: "warning",
        });
      }

      // Dead stock (no sales in 30+ days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const soldProductNames = new Set(
        saleItems.filter((si: any) => new Date(si.sales?.created_at) >= thirtyDaysAgo).map((si: any) => si.product_name)
      );
      const deadStock = products.filter((p) => p.stock_qty > 0 && !soldProductNames.has(p.name));
      if (deadStock.length > 0) {
        const deadValue = deadStock.reduce((s, p) => s + p.cost_price * p.stock_qty, 0);
        tips.push({
          id: "dead-stock",
          icon: Package,
          message: `${deadStock.length} product${deadStock.length > 1 ? "s" : ""} haven't sold in 30+ days (${formatMoney(deadValue, currency)} tied up). Consider a clearance sale.`,
          type: "info",
        });
      }

      // Low margin products
      const lowMarginProducts = products.filter((p) => {
        if (p.selling_price <= 0) return false;
        const margin = ((p.selling_price - p.cost_price) / p.selling_price) * 100;
        return margin < 10 && margin >= 0;
      });
      if (lowMarginProducts.length > 0) {
        tips.push({
          id: "low-margin",
          icon: AlertTriangle,
          message: `${lowMarginProducts.length} product${lowMarginProducts.length > 1 ? "s have" : " has"} less than 10% profit margin. Review pricing to protect profits.`,
          type: "warning",
        });
      }

      setSuggestions(tips.slice(0, 4));
    });
  }, [profile?.company_id]);

  if (suggestions.length === 0) return null;

  const typeStyles = {
    info: "bg-accent/5 border-accent/15 text-accent",
    warning: "bg-warning/5 border-warning/15 text-warning",
    success: "bg-success/5 border-success/15 text-success",
  };

  return (
    <div className="zentra-card p-5 mb-6">
      <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-warning" /> Smart Suggestions
      </h3>
      <div className="space-y-2">
        {suggestions.map((s) => (
          <div key={s.id} className={`flex items-start gap-3 p-3 rounded-lg border ${typeStyles[s.type]}`}>
            <s.icon className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">{s.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
