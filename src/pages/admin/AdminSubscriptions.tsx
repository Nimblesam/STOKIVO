import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoreHorizontal, Search, Calendar, AlertTriangle, CheckCircle, CreditCard } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";

const PLAN_LIMITS: Record<string, { products: number; users: number; price: number }> = {
  starter: { products: 200, users: 1, price: 5 },
  growth: { products: 2000, users: 3, price: 12 },
  pro: { products: 999999, users: 999999, price: 25 },
};

export default function AdminSubscriptions() {
  const { logAction, isSuperAdmin } = useAdminAuth();
  const [subs, setSubs] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data } = await supabase.from("subscriptions").select("*, companies(name, currency, plan, status)").order("started_at", { ascending: false });
    setSubs(data || []);
  };

  useEffect(() => { load(); }, []);

  const changePlan = async (subId: string, plan: string, companyId: string) => {
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
    // Update both subscription and company
    await Promise.all([
      supabase.from("subscriptions").update({
        plan,
        max_products: limits.products,
        max_users: limits.users,
      } as any).eq("id", subId),
      supabase.from("companies").update({ plan } as any).eq("id", companyId),
    ]);
    await logAction("subscription_plan_change", "subscription", subId, { plan, companyId });
    toast({ title: `Plan updated to ${plan} (company + subscription synced)` });
    load();
  };

  const extendTrial = async (sub: any, days: number) => {
    const base = sub.expires_at ? new Date(sub.expires_at) : new Date();
    const newExpiry = new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("subscriptions").update({ expires_at: newExpiry }).eq("id", sub.id);
    await logAction("subscription_trial_extended", "subscription", sub.id, { expires_at: newExpiry, days });
    toast({ title: `Extended by ${days} days` });
    load();
  };

  const getExpiryStatus = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const days = differenceInDays(new Date(expiresAt), new Date());
    if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, variant: "destructive" as const };
    if (days <= 7) return { label: `${days}d left`, variant: "destructive" as const };
    if (days <= 30) return { label: `${days}d left`, variant: "secondary" as const };
    return { label: `${days}d left`, variant: "outline" as const };
  };

  const filtered = subs.filter(s =>
    (s as any).companies?.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Summary stats
  const totalMRR = subs.reduce((sum, s) => sum + (PLAN_LIMITS[s.plan]?.price || 0), 0);
  const expiringSoon = subs.filter(s => s.expires_at && differenceInDays(new Date(s.expires_at), new Date()) <= 7 && differenceInDays(new Date(s.expires_at), new Date()) >= 0).length;
  const expired = subs.filter(s => s.expires_at && new Date(s.expires_at) < new Date()).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">{subs.length} total subscriptions</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Est. MRR</p>
              <p className="text-xl font-bold">£{totalMRR}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expiring Soon</p>
              <p className="text-xl font-bold">{expiringSoon}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expired</p>
              <p className="text-xl font-bold">{expired}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Max Products</TableHead>
              <TableHead>Max Users</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => {
              const expiry = getExpiryStatus(s.expires_at);
              const companyStatus = (s as any).companies?.status;
              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{(s as any).companies?.name}</p>
                      {companyStatus && companyStatus !== "active" && (
                        <Badge variant="destructive" className="text-[10px] mt-0.5">{companyStatus}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isSuperAdmin ? (
                      <Select value={s.plan} onValueChange={(v) => changePlan(s.id, v, s.company_id)}>
                        <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="starter">Starter</SelectItem>
                          <SelectItem value="growth">Growth</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">{s.plan}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{s.max_products >= 999999 ? "Unlimited" : s.max_products}</TableCell>
                  <TableCell>{s.max_users >= 999999 ? "Unlimited" : s.max_users}</TableCell>
                  <TableCell className="text-xs">{format(new Date(s.started_at), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-xs">{s.expires_at ? format(new Date(s.expires_at), "dd MMM yyyy") : "—"}</TableCell>
                  <TableCell>
                    {expiry ? (
                      <Badge variant={expiry.variant}>{expiry.label}</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {isSuperAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => extendTrial(s, 7)}><Calendar className="h-4 w-4 mr-2" />Extend +7 days</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => extendTrial(s, 14)}><Calendar className="h-4 w-4 mr-2" />Extend +14 days</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => extendTrial(s, 30)}><Calendar className="h-4 w-4 mr-2" />Extend +30 days</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No subscriptions found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
