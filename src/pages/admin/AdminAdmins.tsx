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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserPlus, Copy, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function AdminAdmins() {
  const { isSuperAdmin, logAction } = useAdminAuth();
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
      .select("id, email, role, status, full_name, last_login_at, created_at, failed_attempts, locked_until")
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
              <TableHead>Failed Attempts</TableHead>
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
                  {a.failed_attempts > 0 ? (
                    <Badge variant="destructive">{a.failed_attempts}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">0</span>
                  )}
                  {a.locked_until && new Date(a.locked_until) > new Date() && (
                    <Badge variant="destructive" className="ml-1">Locked</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {admins.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
