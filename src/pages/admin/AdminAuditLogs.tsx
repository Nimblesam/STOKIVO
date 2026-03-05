import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { format } from "date-fns";

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      setLogs(data || []);
    };
    load();
  }, []);

  const filtered = logs.filter(l =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.admin_email?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity?.toLowerCase().includes(search.toLowerCase())
  );

  const getActionColor = (action: string) => {
    if (action?.includes("login_success") || action?.includes("created")) return "default";
    if (action?.includes("failed") || action?.includes("locked") || action?.includes("suspend")) return "destructive";
    if (action?.includes("toggle") || action?.includes("change")) return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} log entries</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by action, admin, entity..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead className="w-16">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No audit logs yet</TableCell></TableRow>
            ) : filtered.map((l) => (
              <TableRow key={l.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLog(l)}>
                <TableCell className="text-xs font-medium">{l.admin_email || "—"}</TableCell>
                <TableCell><Badge variant={getActionColor(l.action)}>{l.action}</Badge></TableCell>
                <TableCell className="text-xs">{l.entity || "—"}</TableCell>
                <TableCell className="text-xs font-mono max-w-[120px] truncate">{l.entity_id || "—"}</TableCell>
                <TableCell className="text-xs">{format(new Date(l.created_at), "dd MMM yyyy HH:mm:ss")}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setSelectedLog(l); }}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Audit Log Detail
              {selectedLog && <Badge variant={getActionColor(selectedLog.action)}>{selectedLog.action}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Admin</label>
                  <p className="font-medium">{selectedLog.admin_email || "System"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Timestamp</label>
                  <p className="font-medium">{format(new Date(selectedLog.created_at), "dd MMM yyyy HH:mm:ss")}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Entity Type</label>
                  <p className="font-medium">{selectedLog.entity || "—"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Entity ID</label>
                  <p className="font-mono text-xs break-all">{selectedLog.entity_id || "—"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Admin ID</label>
                  <p className="font-mono text-xs break-all">{selectedLog.admin_id || "—"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Log ID</label>
                  <p className="font-mono text-xs break-all">{selectedLog.id}</p>
                </div>
              </div>

              {selectedLog.metadata && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Metadata</label>
                  <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
