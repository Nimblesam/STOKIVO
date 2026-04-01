import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatMoney } from "@/lib/currency";
import { Card } from "@/components/ui/card";
import { ShoppingBag, DollarSign, Receipt, TrendingUp, TrendingDown } from "lucide-react";
import type { Currency } from "@/lib/types";

interface DailyStats {
  todaySales: number;
  todayRevenue: number;
  todayOrders: number;
  yesterdaySales: number;
  yesterdayRevenue: number;
  yesterdayOrders: number;
}

export function DailyEarningsSummary() {
  const { profile, company } = useAuth();
  const currency = (company?.currency || "GBP") as Currency;
  const [stats, setStats] = useState<DailyStats | null>(null);

  useEffect(() => {
    if (!profile?.company_id) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    Promise.all([
      supabase.from("sales").select("total").eq("company_id", profile.company_id!)
        .gte("created_at", today.toISOString()).lt("created_at", tomorrow.toISOString()),
      supabase.from("sales").select("total").eq("company_id", profile.company_id!)
        .gte("created_at", yesterday.toISOString()).lt("created_at", today.toISOString()),
    ]).then(([todayRes, yesterdayRes]) => {
      const todayData = todayRes.data || [];
      const yesterdayData = yesterdayRes.data || [];
      setStats({
        todaySales: todayData.length,
        todayRevenue: todayData.reduce((s, r) => s + r.total, 0),
        todayOrders: todayData.length,
        yesterdaySales: yesterdayData.length,
        yesterdayRevenue: yesterdayData.reduce((s, r) => s + r.total, 0),
        yesterdayOrders: yesterdayData.length,
      });
    });
  }, [profile?.company_id]);

  if (!stats) return null;

  const revChange = stats.yesterdayRevenue > 0
    ? ((stats.todayRevenue - stats.yesterdayRevenue) / stats.yesterdayRevenue * 100).toFixed(0)
    : stats.todayRevenue > 0 ? "100" : "0";
  const revUp = Number(revChange) >= 0;

  const items = [
    {
      label: "Today's Revenue",
      value: formatMoney(stats.todayRevenue, currency),
      icon: DollarSign,
      change: `${revUp ? "+" : ""}${revChange}% vs yesterday`,
      up: revUp,
    },
    {
      label: "Orders Today",
      value: String(stats.todayOrders),
      icon: ShoppingBag,
      change: `${stats.yesterdayOrders} yesterday`,
      up: stats.todayOrders >= stats.yesterdayOrders,
    },
    {
      label: "Avg Order Value",
      value: stats.todayOrders > 0 ? formatMoney(Math.round(stats.todayRevenue / stats.todayOrders), currency) : formatMoney(0, currency),
      icon: Receipt,
      change: stats.yesterdayOrders > 0
        ? `${formatMoney(Math.round(stats.yesterdayRevenue / stats.yesterdayOrders), currency)} yesterday`
        : "No data yesterday",
      up: true,
    },
  ];

  return (
    <div className="stokivo-card p-5 mb-6">
      <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
        📊 Today's Earnings
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <item.icon className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-display font-bold text-foreground">{item.value}</p>
              <div className="flex items-center gap-1 text-[11px]">
                {item.up ? (
                  <TrendingUp className="h-3 w-3 text-success" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span className={item.up ? "text-success" : "text-destructive"}>{item.change}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
