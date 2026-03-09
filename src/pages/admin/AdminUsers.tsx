import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Search, UserX, UserCheck, Users, ShieldCheck, Eye, Mail, Phone, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AdminPagination } from "@/components/admin/AdminPagination";

export default function AdminUsers() {
  const { logAction, isSuperAdmin } = useAdminAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = async () => {
    setLoading(true);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("*, profiles!inner(full_name, user_id, avatar_url, created_at, company_id)")
      .order("created_at", { ascending: false });
    if (!roles) { setLoading(false); return; }

    const companyIds = [...new Set(roles.map(r => r.company_id))];
    const { data: companies } = await supabase.from("companies").select("id, name, email, phone").in("id", companyIds);
    const companyMap = Object.fromEntries((companies || []).map(c => [c.id, c]));

    setUsers(roles.map(r => ({
      ...r,
      name: (r as any).profiles?.full_name || "Unknown",
      userId: (r as any).profiles?.user_id,
      joinedAt: (r as any).profiles?.created_at,
      companyName: companyMap[r.company_id]?.name || "Unknown",
      companyEmail: companyMap[r.company_id]?.email,
      companyPhone: companyMap[r.company_id]?.phone,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter]);

  const toggleActive = async (userRole: any) => {
    const newActive = !userRole.active;
    await supabase.from("user_roles").update({ active: newActive }).eq("id", userRole.id);
    await logAction(newActive ? "user_enabled" : "user_disabled", "user", userRole.userId, { name: userRole.name, company: userRole.companyName });
    toast({ title: newActive ? "User enabled" : "User disabled" });
    load();
  };

  const changeRole = async (userRole: any, newRole: string) => {
    await supabase.from("user_roles").update({ role: newRole as any }).eq("id", userRole.id);
    await logAction("user_role_changed", "user", userRole.userId, { name: userRole.name, oldRole: userRole.role, newRole });
    toast({ title: `Role changed to ${newRole}` });
    load();
  };

  const viewDetail = async (u: any) => {
    setSelectedUser(u);
    const [sales, invoices] = await Promise.all([
      supabase.from("sales").select("total, created_at").eq("company_id", u.company_id).eq("cashier_id", u.userId).order("created_at", { ascending: false }).limit(50),
      supabase.from("invoices").select("id, status, total").eq("company_id", u.company_id).limit(100),
    ]);
    setUserDetail({
      salesCount: sales.data?.length || 0,
      salesTotal: (sales.data || []).reduce((s, r) => s + (r.total || 0), 0),
      lastSale: sales.data?.[0]?.created_at,
      invoiceCount: invoices.data?.length || 0,
    });
  };

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.companyName.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus = statusFilter === "all" || (statusFilter === "active" ? u.active : !u.active);
    return matchSearch && matchRole && matchStatus;
  });

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalActive = users.filter(u => u.active).length;
  const totalOwners = users.filter(u => u.role === "owner").length;

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{users.length}</p><p className="text-xs text-muted-foreground">Total Users</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10"><UserCheck className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold">{totalActive}</p><p className="text-xs text-muted-foreground">Active</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10"><UserX className="h-5 w-5 text-destructive" /></div>
          <div><p className="text-2xl font-bold">{users.length - totalActive}</p><p className="text-xs text-muted-foreground">Disabled</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10"><ShieldCheck className="h-5 w-5 text-amber-600" /></div>
          <div><p className="text-2xl font-bold">{totalOwners}</p><p className="text-xs text-muted-foreground">Owners</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users or companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : paged.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
            ) : paged.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.companyName}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{u.role}</Badge></TableCell>
                <TableCell>
                  <Badge variant={u.active ? "default" : "destructive"}>
                    {u.active ? "Active" : "Disabled"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {u.joinedAt ? format(new Date(u.joinedAt), "dd MMM yyyy") : "—"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => viewDetail(u)}>
                        <Eye className="h-4 w-4 mr-2" />View Detail
                      </DropdownMenuItem>
                      {u.companyEmail && (
                        <DropdownMenuItem onClick={() => window.open(`mailto:${u.companyEmail}`)}>
                          <Mail className="h-4 w-4 mr-2" />Email Company
                        </DropdownMenuItem>
                      )}
                      {u.companyPhone && (
                        <>
                          <DropdownMenuItem onClick={() => window.open(`tel:${u.companyPhone}`)}>
                            <Phone className="h-4 w-4 mr-2" />Call
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`https://wa.me/${u.companyPhone.replace(/\D/g, "")}`)}>
                            <MessageCircle className="h-4 w-4 mr-2" />WhatsApp
                          </DropdownMenuItem>
                        </>
                      )}
                      {isSuperAdmin && (
                        <>
                          <DropdownMenuItem onClick={() => toggleActive(u)}>
                            {u.active ? <><UserX className="h-4 w-4 mr-2" />Disable</> : <><UserCheck className="h-4 w-4 mr-2" />Enable</>}
                          </DropdownMenuItem>
                          {u.role !== "owner" && (
                            <DropdownMenuItem onClick={() => changeRole(u, u.role === "manager" ? "staff" : "manager")}>
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              {u.role === "manager" ? "Demote to Staff" : "Promote to Manager"}
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

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => { setSelectedUser(null); setUserDetail(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedUser?.name}
              <Badge variant="outline" className="capitalize">{selectedUser?.role}</Badge>
              <Badge variant={selectedUser?.active ? "default" : "destructive"}>
                {selectedUser?.active ? "Active" : "Disabled"}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {selectedUser && userDetail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Company</p><p className="font-medium">{selectedUser.companyName}</p></div>
                <div><p className="text-xs text-muted-foreground">Joined</p><p>{selectedUser.joinedAt ? format(new Date(selectedUser.joinedAt), "dd MMM yyyy") : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">User ID</p><p className="font-mono text-xs">{selectedUser.userId?.slice(0, 16)}...</p></div>
                <div><p className="text-xs text-muted-foreground">Company ID</p><p className="font-mono text-xs">{selectedUser.company_id?.slice(0, 16)}...</p></div>
              </div>
              <div className="border-t pt-3">
                <h4 className="font-medium mb-2">Activity</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">{userDetail.salesCount}</p>
                    <p className="text-xs text-muted-foreground">Sales</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">£{(userDetail.salesTotal / 100).toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">{userDetail.invoiceCount}</p>
                    <p className="text-xs text-muted-foreground">Invoices</p>
                  </div>
                </div>
                {userDetail.lastSale && (
                  <p className="text-xs text-muted-foreground mt-2">Last sale: {format(new Date(userDetail.lastSale), "dd MMM yyyy HH:mm")}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
