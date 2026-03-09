import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Users, CreditCard, ArrowLeftRight, AlertTriangle,
  CheckCircle, TrendingUp, Activity, BarChart3,
} from "lucide-react";
import { format, subDays } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";

const PLAN_COLORS: Record<string, string> = {
  starter: "hsl(var(--chart-3))",
  growth: "hsl(var(--chart-2))",
  pro: "hsl(var(--chart-1))",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalCompanies: 0, activeCompanies: 0, suspendedCompanies: 0, newCompanies30d: 0,
    totalUsers: 0, totalSales: 0, totalAlerts: 0,
    mrrEstimate: 0, platformFees: 0,
  });
  const [planDistribution, setPlanDistribution] = useState<any[]>([]);
  const [signupTrend, setSignupTrend] = useState<any[]>([]);
  const [recentCompanies, setRecentCompanies] = useState<any[]>([]);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [companies, users, sales, alerts, subscriptions] = await Promise.all([
        supabase.from("companies").select("id, status, created_at, plan, name, country"),
        supabase.from("profiles").select("id"),
        supabase.from("sales").select("total, created_at"),
        supabase.from("alerts").select("id").eq("read", false),
        supabase.from("subscriptions").select("plan"),
      ]);

      const comps = companies.data || [];
      const salesData = sales.data || [];
      const subs = subscriptions.data || [];

      const recentSales = salesData.filter((s: any) => s.created_at >= thirtyDaysAgo);
      const totalVolume = recentSales.reduce((sum, s) => sum + (s.total || 0), 0);
      const platformFees = Math.round(totalVolume * 0.005);

      const planPrices: Record<string, number> = { starter: 500, growth: 1200, pro: 2500 };
      const mrr = subs.reduce((sum, s) => sum + (planPrices[s.plan] || 0), 0);

      setStats({
        totalCompanies: comps.length,
        activeCompanies: comps.filter(c => c.status === "active").length,
        suspendedCompanies: comps.filter(c => c.status === "suspended" || c.status === "disabled").length,
        newCompanies30d: comps.filter(c => c.created_at >= thirtyDaysAgo).length,
        totalUsers: (users.data || []).length,
        totalSales: totalVolume,
        totalAlerts: (alerts.data || []).length,
        mrrEstimate: mrr,
        platformFees,
      });

      // Plan distribution
      const planCounts: Record<string, number> = {};
      comps.forEach(c => { planCounts[c.plan] = (planCounts[c.plan] || 0) + 1; });
      setPlanDistribution(Object.entries(planCounts).map(([name, value]) => ({ name, value })));

      // Signup trend (last 30 days)
      const trend: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const day = format(subDays(now, i), "dd MMM");
        trend[day] = 0;
      }
      comps.forEach(c => {
        const day = format(new Date(c.created_at), "dd MMM");
        if (trend[day] !== undefined) trend[day]++;
      });
      setSignupTrend(Object.entries(trend).map(([date, count]) => ({ date, count })));

      // Sales trend (last 30 days)
      const sTrend: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const day = format(subDays(now, i), "dd MMM");
        sTrend[day] = 0;
      }
      salesData.forEach(s => {
        const day = format(new Date(s.created_at), "dd MMM");
        if (sTrend[day] !== undefined) sTrend[day] += (s.total || 0);
      });
      setSalesTrend(Object.entries(sTrend).map(([date, amount]) => ({ date, amount: amount / 100 })));

      // Recent companies (sorted by newest first)
      setRecentCompanies([...comps].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5));
    };
    load();
  }, []);

  const kpis = [
    { label: "Total Companies", value: stats.totalCompanies, icon: Building2, accent: "bg-blue-500/10 text-blue-600" },
    { label: "Active Companies", value: stats.activeCompanies, icon: CheckCircle, accent: "bg-emerald-500/10 text-emerald-600" },
    { label: "Suspended", value: stats.suspendedCompanies, icon: AlertTriangle, accent: "bg-destructive/10 text-destructive" },
    { label: "New (30d)", value: stats.newCompanies30d, icon: TrendingUp, accent: "bg-purple-500/10 text-purple-600" },
    { label: "Total Users", value: stats.totalUsers, icon: Users, accent: "bg-orange-500/10 text-orange-600" },
    { label: "MRR", value: `£${stats.mrrEstimate.toLocaleString()}`, icon: CreditCard, accent: "bg-emerald-500/10 text-emerald-600" },
    { label: "Sales Vol (30d)", value: `£${(stats.totalSales / 100).toLocaleString()}`, icon: ArrowLeftRight, accent: "bg-cyan-500/10 text-cyan-600" },
    { label: "Platform Fees", value: `£${(stats.platformFees / 100).toLocaleString()}`, icon: Activity, accent: "bg-teal-500/10 text-teal-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform overview & metrics</p>
        </div>
        <span className="text-xs text-muted-foreground border rounded-full px-3 py-1">
          {format(new Date(), "dd MMM yyyy, HH:mm")}
        </span>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${k.accent}`}>
                  <k.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-xl font-bold">{k.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sales Trend */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Sales Volume (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid hsl(var(--border))' }} />
                  <Area type="monotone" dataKey="amount" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {planDistribution.map((entry) => (
                      <Cell key={entry.name} fill={PLAN_COLORS[entry.name] || "hsl(var(--muted))"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signup Trend + Recent Companies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Company Signups (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={signupTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={6} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Companies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentCompanies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No companies yet</p>
            ) : recentCompanies.map(c => (
              <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.country} · {format(new Date(c.created_at), "dd MMM yyyy")}</p>
                </div>
                <div className="flex gap-1.5">
                  <Badge variant="outline" className="text-[10px]">{c.plan}</Badge>
                  <Badge variant={c.status === "active" ? "default" : "destructive"} className="text-[10px]">{c.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
