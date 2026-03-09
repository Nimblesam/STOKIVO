import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserPlus, Copy, CheckCircle, Loader2, MoreHorizontal, Unlock, Ban, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function AdminAdmins() {
  const { isSuperAdmin, logAction, adminUser } = useAdminAuth();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("support_admin");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("admin_users")
      .select("id, email, role, status, full_name, last_login_at, created_at, failed_attempts, locked_until, user_id")
      .order("created_at", { ascending: true });
    setAdmins((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async () => {
    setInviteError(null);
    setInviteLink(null);
    if (!inviteEmail.trim()) {
      setInviteError("Email is required");
      return;
    }

    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-invite", {
        body: { email: inviteEmail.trim(), role: inviteRole },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setInviteLink(data.invite_link);
      toast({ title: "Invite created!", description: `Link valid for ${data.expires_in_minutes} minutes` });
      load();
    } catch (err: any) {
      setInviteError(err.message || "Failed to create invite");
    } finally {
      setInviting(false);
    }
  };

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast({ title: "Link copied to clipboard" });
    }
  };

  const resetInviteForm = () => {
    setInviteEmail("");
    setInviteRole("support_admin");
    setInviteLink(null);
    setInviteError(null);
  };

  const unlockAdmin = async (admin: any) => {
    await supabase.from("admin_users").update({ locked_until: null, failed_attempts: 0 } as any).eq("id", admin.id);
    await logAction("admin_unlocked", "admin_user", admin.id, { email: admin.email });
    toast({ title: `${admin.email} unlocked` });
    load();
  };

  const toggleStatus = async (admin: any, newStatus: string) => {
    await supabase.from("admin_users").update({ status: newStatus } as any).eq("id", admin.id);
    await logAction(`admin_${newStatus}`, "admin_user", admin.id, { email: admin.email });
    toast({ title: `Admin ${newStatus === "active" ? "activated" : "suspended"}` });
    load();
  };

  const changeRole = async (admin: any, newRole: string) => {
    await supabase.from("admin_users").update({ role: newRole } as any).eq("id", admin.id);
    await logAction("admin_role_changed", "admin_user", admin.id, { email: admin.email, oldRole: admin.role, newRole });
    toast({ title: `Role changed to ${newRole.replace("_", " ")}` });
    load();
  };

  const isLocked = (a: any) => a.locked_until && new Date(a.locked_until) > new Date();
  const isSelf = (a: any) => a.user_id === adminUser?.id || a.email === adminUser?.email;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin Users</h1>
        {isSuperAdmin && (
          <Dialog open={inviteOpen} onOpenChange={(open) => { setInviteOpen(open); if (!open) resetInviteForm(); }}>
            <DialogTrigger asChild>
              <Button><UserPlus className="h-4 w-4 mr-2" />Invite Admin</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Invite New Admin</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {inviteLink ? (
                  <div className="space-y-3">
                    <Alert>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription>
                        Invite created! Share this link with the admin (expires in 30 minutes):
                      </AlertDescription>
                    </Alert>
                    <div className="flex gap-2">
                      <Input value={inviteLink} readOnly className="text-xs font-mono" />
                      <Button variant="outline" size="icon" onClick={copyLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button variant="outline" className="w-full" onClick={resetInviteForm}>
                      Invite Another
                    </Button>
                  </div>
                ) : (
                  <>
                    {inviteError && (
                      <Alert variant="destructive">
                        <AlertDescription className="text-xs">{inviteError}</AlertDescription>
                      </Alert>
                    )}
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="admin@example.com" />
                    </div>
                    <div>
                      <Label>Role</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                          <SelectItem value="support_admin">Support Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleInvite} disabled={inviting} className="w-full">
                      {inviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                      Send Invite
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Security</TableHead>
              {isSuperAdmin && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.email}</TableCell>
                <TableCell>{a.full_name || "—"}</TableCell>
                <TableCell>
                  <Badge variant={a.role === "super_admin" ? "default" : "secondary"}>
                    {a.role.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={a.status === "active" ? "default" : a.status === "invited" ? "secondary" : "destructive"}>
                    {a.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {a.last_login_at ? format(new Date(a.last_login_at), "dd MMM yyyy HH:mm") : "Never"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(a.created_at), "dd MMM yyyy")}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {a.failed_attempts > 0 && (
                      <Badge variant="destructive" className="text-[10px]">{a.failed_attempts} fails</Badge>
                    )}
                    {isLocked(a) && (
                      <Badge variant="destructive" className="text-[10px]">Locked</Badge>
                    )}
                    {a.failed_attempts === 0 && !isLocked(a) && (
                      <span className="text-xs text-muted-foreground">OK</span>
                    )}
                  </div>
                </TableCell>
                {isSuperAdmin && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isSelf(a)}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isLocked(a) && (
                          <DropdownMenuItem onClick={() => unlockAdmin(a)}>
                            <Unlock className="h-4 w-4 mr-2" />Unlock Account
                          </DropdownMenuItem>
                        )}
                        {a.failed_attempts > 0 && !isLocked(a) && (
                          <DropdownMenuItem onClick={() => unlockAdmin(a)}>
                            <Unlock className="h-4 w-4 mr-2" />Reset Failed Attempts
                          </DropdownMenuItem>
                        )}
                        {a.role === "support_admin" && (
                          <DropdownMenuItem onClick={() => changeRole(a, "super_admin")}>
                            <ShieldCheck className="h-4 w-4 mr-2" />Promote to Super Admin
                          </DropdownMenuItem>
                        )}
                        {a.role === "super_admin" && (
                          <DropdownMenuItem onClick={() => changeRole(a, "support_admin")}>
                            <ShieldCheck className="h-4 w-4 mr-2" />Demote to Support Admin
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {a.status === "active" ? (
                          <DropdownMenuItem onClick={() => toggleStatus(a, "suspended")} className="text-destructive">
                            <Ban className="h-4 w-4 mr-2" />Suspend
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => toggleStatus(a, "active")}>
                            <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />Activate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {admins.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={isSuperAdmin ? 8 : 7} className="text-center text-muted-foreground py-8">
                  No admin users yet. Bootstrap the first super admin.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
