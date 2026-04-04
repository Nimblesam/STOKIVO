import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Search, Eye, Ban, Unlock, CheckCircle, XCircle, Mail, Phone, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AdminPagination } from "@/components/admin/AdminPagination";

export default function AdminCompanies() {
  const { logAction, isSuperAdmin } = useAdminAuth();
  const [companies, setCompanies] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any | null>(null);
  const [usage, setUsage] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<{ company: any; action: string } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
    setCompanies(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const updateStatus = async (company: any, newStatus: string) => {
    await supabase.from("companies").update({ status: newStatus } as any).eq("id", company.id);
    await logAction(`company_${newStatus}`, "company", company.id, { name: company.name, previousStatus: company.status });
    
    // Send approval email to the company owner
    if (newStatus === "active" && company.status === "pending") {
      try {
        // Get the owner's profile to find their email and name
        const { data: ownerRole } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("company_id", company.id)
          .eq("role", "owner")
          .single();
        
        if (ownerRole) {
          const [{ data: profile }, { data: ownerEmail }] = await Promise.all([
            supabase.from("profiles").select("full_name").eq("user_id", ownerRole.user_id).single(),
            supabase.rpc("admin_get_user_email", { _user_id: ownerRole.user_id }),
          ]);

          const email = ownerEmail || company.email;
          if (email) {
            await supabase.functions.invoke("send-transactional-email", {
              body: {
                templateName: "account-approved",
                recipientEmail: email,
                idempotencyKey: `account-approved-${company.id}`,
                templateData: {
                  companyName: company.name,
                  ownerName: profile?.full_name || "",
                  plan: company.plan ? company.plan.charAt(0).toUpperCase() + company.plan.slice(1) : "",
                },
              },
            });
          }
        }
      } catch (e) {
        console.error("Failed to send approval email:", e);
        // Don't block the approval if email fails
      }
    }
    
    toast({ title: `Company ${newStatus === "active" ? "approved" : newStatus}` });
    load();
  };

  const changePlan = async (companyId: string, plan: string) => {
    await supabase.from("companies").update({ plan } as any).eq("id", companyId);
    await supabase.from("subscriptions").update({ plan } as any).eq("company_id", companyId);
    await logAction("company_plan_change", "company", companyId, { plan });
    toast({ title: "Plan updated on company and subscription" });
    load();
  };

  const viewDetails = async (company: any) => {
    setDetail(company);
    const [products, users, invoices, sales, subscription] = await Promise.all([
      supabase.from("products").select("id").eq("company_id", company.id),
      supabase.from("user_roles").select("id, role").eq("company_id", company.id),
      supabase.from("invoices").select("id, status").eq("company_id", company.id),
      supabase.from("sales").select("total").eq("company_id", company.id),
      supabase.from("subscriptions").select("*").eq("company_id", company.id).maybeSingle(),
    ]);
    setUsage({
      products: products.data?.length || 0,
      users: users.data?.length || 0,
      userRoles: users.data || [],
      invoices: invoices.data?.length || 0,
      paidInvoices: (invoices.data || []).filter(i => i.status === "paid").length,
      salesVolume: (sales.data || []).reduce((s, r) => s + (r.total || 0), 0),
      salesCount: sales.data?.length || 0,
      subscription: subscription.data,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Active</Badge>;
      case "suspended": return <Badge variant="destructive">Suspended</Badge>;
      case "disabled": return <Badge className="bg-muted text-muted-foreground">Disabled</Badge>;
      case "pending": return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filtered = companies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.country?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Companies</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {companies.length} companies</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
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
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : paged.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No companies found</TableCell></TableRow>
            ) : paged.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{c.name}</p>
                    {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                  </div>
                </TableCell>
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
                <TableCell>{getStatusBadge(c.status)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(c.created_at), "dd MMM yyyy")}</TableCell>
                <TableCell>
                  <Badge variant={c.stripe_account_id ? "default" : "secondary"} className="text-[10px]">
                    {c.stripe_account_id ? "Connected" : "No"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => viewDetails(c)}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                      {c.email && (
                        <DropdownMenuItem onClick={() => window.open(`mailto:${c.email}`, "_blank")}>
                          <Mail className="h-4 w-4 mr-2" />Send Email
                        </DropdownMenuItem>
                      )}
                      {c.phone && (
                        <DropdownMenuItem onClick={() => window.open(`tel:${c.phone}`, "_blank")}>
                          <Phone className="h-4 w-4 mr-2" />Call
                        </DropdownMenuItem>
                      )}
                      {c.phone && (
                        <DropdownMenuItem onClick={() => window.open(`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}`, "_blank")}>
                          <MessageCircle className="h-4 w-4 mr-2" />WhatsApp
                        </DropdownMenuItem>
                      )}
                      {isSuperAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          {c.status !== "active" && (
                            <DropdownMenuItem onClick={() => updateStatus(c, "active")}>
                              <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />Approve / Activate
                            </DropdownMenuItem>
                          )}
                          {c.status === "active" && (
                            <DropdownMenuItem onClick={() => setConfirmAction({ company: c, action: "suspended" })}>
                              <Ban className="h-4 w-4 mr-2 text-destructive" />Suspend
                            </DropdownMenuItem>
                          )}
                          {c.status !== "disabled" && (
                            <DropdownMenuItem onClick={() => setConfirmAction({ company: c, action: "disabled" })} className="text-destructive">
                              <XCircle className="h-4 w-4 mr-2" />Disable
                            </DropdownMenuItem>
                          )}
                          {(c.status === "suspended" || c.status === "disabled") && (
                            <DropdownMenuItem onClick={() => updateStatus(c, "active")}>
                              <Unlock className="h-4 w-4 mr-2" />Re-activate
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AdminPagination
        currentPage={page}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
      />

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => { setDetail(null); setUsage(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detail?.name}
              {detail && getStatusBadge(detail.status)}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Country</label><p>{detail.country}</p></div>
                <div><label className="text-xs text-muted-foreground">Currency</label><p>{detail.currency}</p></div>
                <div><label className="text-xs text-muted-foreground">Plan</label><p className="capitalize">{detail.plan}</p></div>
                <div><label className="text-xs text-muted-foreground">Business Type</label><p className="capitalize">{detail.business_type}</p></div>
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <div className="flex items-center gap-2">
                    <p>{detail.email || "—"}</p>
                    {detail.email && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(`mailto:${detail.email}`, "_blank")}>
                        <Mail className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Phone</label>
                  <div className="flex items-center gap-2">
                    <p>{detail.phone || "—"}</p>
                    {detail.phone && (
                      <>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(`tel:${detail.phone}`, "_blank")}>
                          <Phone className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(`https://wa.me/${detail.phone.replace(/[^0-9]/g, "")}`, "_blank")}>
                          <MessageCircle className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="col-span-2"><label className="text-xs text-muted-foreground">Address</label><p>{detail.address || "—"}</p></div>
              </div>
              {usage && (
                <>
                  <div className="border-t pt-3">
                    <h4 className="font-medium mb-2">Usage Summary</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold">{usage.products}</p>
                        <p className="text-xs text-muted-foreground">Products</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold">{usage.users}</p>
                        <p className="text-xs text-muted-foreground">Users</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold">{usage.salesCount}</p>
                        <p className="text-xs text-muted-foreground">Sales</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold">{usage.invoices}</p>
                        <p className="text-xs text-muted-foreground">Invoices</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold">{usage.paidInvoices}</p>
                        <p className="text-xs text-muted-foreground">Paid</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold">£{(usage.salesVolume / 100).toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                      </div>
                    </div>
                  </div>
                  {usage.subscription && (
                    <div className="border-t pt-3">
                      <h4 className="font-medium mb-2">Subscription</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Plan:</span> <span className="capitalize font-medium">{usage.subscription.plan}</span></div>
                        <div><span className="text-muted-foreground">Max Products:</span> {usage.subscription.max_products}</div>
                        <div><span className="text-muted-foreground">Max Users:</span> {usage.subscription.max_users}</div>
                        <div><span className="text-muted-foreground">Started:</span> {format(new Date(usage.subscription.started_at), "dd MMM yyyy")}</div>
                        {usage.subscription.expires_at && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Expires:</span>{" "}
                            <span className={new Date(usage.subscription.expires_at) < new Date() ? "text-destructive font-medium" : ""}>
                              {format(new Date(usage.subscription.expires_at), "dd MMM yyyy")}
                              {new Date(usage.subscription.expires_at) < new Date() && " (EXPIRED)"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for destructive actions */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "suspended" ? "Suspend" : "Disable"} {confirmAction?.company?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "suspended"
                ? "This will temporarily restrict the company's access. They can be re-activated later."
                : "This will permanently disable the company. Their users will lose access immediately."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmAction) {
                  updateStatus(confirmAction.company, confirmAction.action);
                  setConfirmAction(null);
                }
              }}
            >
              {confirmAction?.action === "suspended" ? "Suspend" : "Disable"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
