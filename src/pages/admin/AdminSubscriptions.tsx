import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Search, Calendar, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function AdminSubscriptions() {
  const { logAction, isSuperAdmin } = useAdminAuth();
  const [subs, setSubs] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data } = await supabase.from("subscriptions").select("*, companies(name, currency)").order("started_at", { ascending: false });
    setSubs(data || []);
  };

  useEffect(() => { load(); }, []);

  const changePlan = async (subId: string, plan: string, companyId: string) => {
    await supabase.from("subscriptions").update({ plan } as any).eq("id", subId);
    await supabase.from("companies").update({ plan } as any).eq("id", companyId);
    await logAction("subscription_plan_change", "subscription", subId, { plan });
    toast({ title: "Plan updated" });
    load();
  };

  const extendTrial = async (sub: any) => {
    const newExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("subscriptions").update({ expires_at: newExpiry }).eq("id", sub.id);
    await logAction("subscription_trial_extended", "subscription", sub.id, { expires_at: newExpiry });
    toast({ title: "Trial extended 14 days" });
    load();
  };

  const filtered = subs.filter(s =>
    (s as any).companies?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
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
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{(s as any).companies?.name}</TableCell>
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
                <TableCell>{s.max_products}</TableCell>
                <TableCell>{s.max_users}</TableCell>
                <TableCell className="text-xs">{format(new Date(s.started_at), "dd MMM yyyy")}</TableCell>
                <TableCell className="text-xs">{s.expires_at ? format(new Date(s.expires_at), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell>
                  {isSuperAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => extendTrial(s)}><Calendar className="h-4 w-4 mr-2" />Extend Trial +14d</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No subscriptions found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
