import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Search, Eye, Ban, Unlock, ArrowUpDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function AdminCompanies() {
  const { logAction, isSuperAdmin } = useAdminAuth();
  const [companies, setCompanies] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any | null>(null);
  const [usage, setUsage] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
    setCompanies(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleSuspend = async (company: any) => {
    const newStatus = company.status === "active" ? "suspended" : "active";
    await supabase.from("companies").update({ status: newStatus } as any).eq("id", company.id);
    await logAction(`company_${newStatus}`, "company", company.id, { name: company.name });
    toast({ title: `Company ${newStatus}` });
    load();
  };

  const changePlan = async (companyId: string, plan: string) => {
    await supabase.from("companies").update({ plan } as any).eq("id", companyId);
    await logAction("company_plan_change", "company", companyId, { plan });
    toast({ title: "Plan updated" });
    load();
  };

  const viewDetails = async (company: any) => {
    setDetail(company);
    const [products, users, invoices, sales] = await Promise.all([
      supabase.from("products").select("id").eq("company_id", company.id),
      supabase.from("user_roles").select("id").eq("company_id", company.id),
      supabase.from("invoices").select("id").eq("company_id", company.id),
      supabase.from("sales").select("total").eq("company_id", company.id),
    ]);
    setUsage({
      products: products.data?.length || 0,
      users: users.data?.length || 0,
      invoices: invoices.data?.length || 0,
      salesVolume: (sales.data || []).reduce((s, r) => s + (r.total || 0), 0),
    });
  };

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.country?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Companies</h1>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Stripe</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.country}</TableCell>
                <TableCell>{c.currency}</TableCell>
                <TableCell>
                  {isSuperAdmin ? (
                    <Select value={c.plan} onValueChange={(v) => changePlan(c.id, v)}>
                      <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="growth">Growth</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline">{c.plan}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={c.status === "active" ? "default" : "destructive"}>
                    {c.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(c.created_at), "dd MMM yyyy")}</TableCell>
                <TableCell>
                  <Badge variant={c.stripe_account_id ? "default" : "secondary"}>
                    {c.stripe_account_id ? "Connected" : "Not Connected"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => viewDetails(c)}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                      {isSuperAdmin && (
                        <DropdownMenuItem onClick={() => toggleSuspend(c)}>
                          {c.status === "active" ? <><Ban className="h-4 w-4 mr-2" />Suspend</> : <><Unlock className="h-4 w-4 mr-2" />Unsuspend</>}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No companies found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!detail} onOpenChange={() => { setDetail(null); setUsage(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{detail?.name}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Country:</span> {detail.country}</div>
                <div><span className="text-muted-foreground">Currency:</span> {detail.currency}</div>
                <div><span className="text-muted-foreground">Plan:</span> {detail.plan}</div>
                <div><span className="text-muted-foreground">Status:</span> {detail.status}</div>
                <div><span className="text-muted-foreground">Email:</span> {detail.email || "—"}</div>
                <div><span className="text-muted-foreground">Phone:</span> {detail.phone || "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {detail.address || "—"}</div>
              </div>
              {usage && (
                <div className="border-t pt-3">
                  <h4 className="font-medium mb-2">Usage</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Products: {usage.products}</div>
                    <div>Users: {usage.users}</div>
                    <div>Invoices: {usage.invoices}</div>
                    <div>Sales Volume: £{(usage.salesVolume / 100).toFixed(2)}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
