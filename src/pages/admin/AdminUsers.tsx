import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Search, UserX, UserCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AdminUsers() {
  const { logAction, isSuperAdmin } = useAdminAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from("user_roles").select("*, profiles!inner(full_name, user_id)").order("created_at", { ascending: false });
    if (!roles) { setLoading(false); return; }

    // Get company names
    const companyIds = [...new Set(roles.map(r => r.company_id))];
    const { data: companies } = await supabase.from("companies").select("id, name").in("id", companyIds);
    const companyMap = Object.fromEntries((companies || []).map(c => [c.id, c.name]));

    setUsers(roles.map(r => ({
      ...r,
      name: (r as any).profiles?.full_name || "Unknown",
      userId: (r as any).profiles?.user_id,
      companyName: companyMap[r.company_id] || "Unknown",
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (userRole: any) => {
    const newActive = !userRole.active;
    await supabase.from("user_roles").update({ active: newActive }).eq("id", userRole.id);
    await logAction(newActive ? "user_enabled" : "user_disabled", "user", userRole.userId, { email: userRole.name });
    toast({ title: newActive ? "User enabled" : "User disabled" });
    load();
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.companyName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.companyName}</TableCell>
                <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                <TableCell>
                  <Badge variant={u.active ? "default" : "destructive"}>
                    {u.active ? "Active" : "Disabled"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {isSuperAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleActive(u)}>
                          {u.active ? <><UserX className="h-4 w-4 mr-2" />Disable</> : <><UserCheck className="h-4 w-4 mr-2" />Enable</>}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
