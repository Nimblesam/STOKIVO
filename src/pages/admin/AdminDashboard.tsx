import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, CreditCard, ArrowLeftRight, AlertTriangle, CheckCircle } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalCompanies: 0, activeCompanies: 0, newCompanies30d: 0,
    totalUsers: 0, totalSales: 0, totalAlerts: 0,
    mrrEstimate: 0, platformFees: 0,
  });

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [companies, users, sales, alerts, subscriptions] = await Promise.all([
        supabase.from("companies").select("id, status, created_at"),
        supabase.from("profiles").select("id"),
        supabase.from("sales").select("total, created_at"),
        supabase.from("alerts").select("id").eq("read", false),
        supabase.from("subscriptions").select("plan"),
      ]);

      const comps = companies.data || [];
      const salesData = sales.data || [];
      const subs = subscriptions.data || [];

      const recentSales = salesData.filter(s => s.created_at >= thirtyDaysAgo);
      const totalVolume = recentSales.reduce((sum, s) => sum + (s.total || 0), 0);
      const platformFees = Math.round(totalVolume * 0.005);

      // MRR estimate based on plan counts
      const planPrices: Record<string, number> = { starter: 0, growth: 2900, pro: 9900 };
      const mrr = subs.reduce((sum, s) => sum + (planPrices[s.plan] || 0), 0);

      setStats({
        totalCompanies: comps.length,
        activeCompanies: comps.filter(c => (c as any).status === "active").length,
        newCompanies30d: comps.filter(c => c.created_at >= thirtyDaysAgo).length,
        totalUsers: (users.data || []).length,
        totalSales: totalVolume,
        totalAlerts: (alerts.data || []).length,
        mrrEstimate: mrr,
        platformFees,
      });
    };
    load();
  }, []);

  const kpis = [
    { label: "Total Companies", value: stats.totalCompanies, icon: Building2, color: "text-blue-600" },
    { label: "Active Companies", value: stats.activeCompanies, icon: CheckCircle, color: "text-green-600" },
    { label: "New (30d)", value: stats.newCompanies30d, icon: Building2, color: "text-purple-600" },
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-orange-600" },
    { label: "MRR Estimate", value: `£${(stats.mrrEstimate / 100).toFixed(0)}`, icon: CreditCard, color: "text-emerald-600" },
    { label: "Sales Volume (30d)", value: `£${(stats.totalSales / 100).toFixed(0)}`, icon: ArrowLeftRight, color: "text-cyan-600" },
    { label: "Platform Fees (30d)", value: `£${(stats.platformFees / 100).toFixed(0)}`, icon: CreditCard, color: "text-teal-600" },
    { label: "Unread Alerts", value: stats.totalAlerts, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <k.icon className={`h-3.5 w-3.5 ${k.color}`} />
                {k.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
