import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, User, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AdminSupport() {
  const { logAction } = useAdminAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ companies: any[]; users: any[] }>({ companies: [], users: [] });
  const [ticketNote, setTicketNote] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearched(true);
    const [comps, profiles] = await Promise.all([
      supabase.from("companies").select("id, name, country, plan, status").ilike("name", `%${query}%`).limit(10),
      supabase.from("profiles").select("id, full_name, user_id, company_id").ilike("full_name", `%${query}%`).limit(10),
    ]);
    setResults({ companies: comps.data || [], users: profiles.data || [] });
    await logAction("support_search", undefined, undefined, { query });
  };

  const createTicket = async () => {
    if (!ticketNote.trim()) return;
    await supabase.from("admin_audit_logs").insert({
      action_type: "support_ticket_note",
      metadata: { note: ticketNote },
    } as any);
    await logAction("support_ticket_created", undefined, undefined, { note: ticketNote });
    toast({ title: "Support ticket note saved" });
    setTicketNote("");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Support Tools</h1>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-sm">Quick Search</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input placeholder="Search company or user..." value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
            <Button onClick={handleSearch}><Search className="h-4 w-4 mr-2" />Search</Button>
          </div>

          {searched && (
            <div className="space-y-4">
              {results.companies.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Building2 className="h-3 w-3" />Companies</h4>
                  <div className="space-y-1">
                    {results.companies.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-2 border rounded text-sm">
                        <span className="font-medium">{c.name}</span>
                        <div className="flex gap-2">
                          <Badge variant="outline">{c.country}</Badge>
                          <Badge variant="outline">{c.plan}</Badge>
                          <Badge variant={c.status === "active" ? "default" : "destructive"}>{c.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {results.users.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><User className="h-3 w-3" />Users</h4>
                  <div className="space-y-1">
                    {results.users.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-2 border rounded text-sm">
                        <span className="font-medium">{u.full_name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{u.user_id?.slice(0, 8)}...</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {results.companies.length === 0 && results.users.length === 0 && (
                <p className="text-sm text-muted-foreground">No results found</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Internal Support Note</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={ticketNote} onChange={(e) => setTicketNote(e.target.value)} placeholder="Add internal support ticket note..." rows={3} className="mb-3" />
          <Button onClick={createTicket} disabled={!ticketNote.trim()}>Save Note</Button>
        </CardContent>
      </Card>
    </div>
  );
}
