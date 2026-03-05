import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, RotateCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AdminSystem() {
  const { logAction } = useAdminAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [noteJob, setNoteJob] = useState<any>(null);
  const [note, setNote] = useState("");

  const load = async () => {
    const { data } = await supabase.from("system_jobs_log").select("*").order("created_at", { ascending: false }).limit(200);
    setJobs(data || []);
  };

  useEffect(() => { load(); }, []);

  const markResolved = async (job: any) => {
    await supabase.from("system_jobs_log").update({ resolved: true, resolved_at: new Date().toISOString() } as any).eq("id", job.id);
    await logAction("system_job_resolved", "system_job", job.id);
    toast({ title: "Marked resolved" });
    load();
  };

  const saveNote = async () => {
    if (!noteJob) return;
    await supabase.from("system_jobs_log").update({ internal_notes: note } as any).eq("id", noteJob.id);
    toast({ title: "Note saved" });
    setNoteJob(null);
    setNote("");
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">System Alerts & Logs</h1>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Error</TableHead>
              <TableHead>Resolved</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No system jobs logged</TableCell></TableRow>
            ) : jobs.map((j) => (
              <TableRow key={j.id}>
                <TableCell className="font-medium">{j.job_type}</TableCell>
                <TableCell><Badge variant={j.status === "success" ? "default" : "destructive"}>{j.status}</Badge></TableCell>
                <TableCell className="text-xs max-w-[200px] truncate">{j.error_message || "—"}</TableCell>
                <TableCell>{j.resolved ? <CheckCircle className="h-4 w-4 text-green-600" /> : "—"}</TableCell>
                <TableCell className="text-xs">{new Date(j.created_at).toLocaleString()}</TableCell>
                <TableCell className="flex gap-1">
                  {!j.resolved && (
                    <Button size="sm" variant="outline" onClick={() => markResolved(j)}><CheckCircle className="h-3 w-3" /></Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => { setNoteJob(j); setNote(j.internal_notes || ""); }}>Note</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!noteJob} onOpenChange={() => setNoteJob(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Internal Notes</DialogTitle></DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="Add internal notes..." />
          <Button onClick={saveNote}>Save Note</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
