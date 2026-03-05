import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Building2, User, Eye, MessageSquare, Clock, AlertTriangle, Mail, Phone, MessageCircle, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function AdminSupport() {
  const { logAction, adminUser } = useAdminAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ companies: any[]; users: any[] }>({ companies: [], users: [] });
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [ticketNote, setTicketNote] = useState("");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCompany, setTicketCompany] = useState("");
  const [ticketPriority, setTicketPriority] = useState("normal");
  const [supportNotes, setSupportNotes] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [companyDetail, setCompanyDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadSupportNotes();
  }, []);

  const loadSupportNotes = async () => {
    const { data, error } = await supabase
      .from("admin_audit_logs")
      .select("*")
      .eq("action", "support_ticket_created")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("Failed to load support notes:", error);
      toast({ title: "Failed to load support notes", variant: "destructive" });
      return;
    }
    setSupportNotes(data || []);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearched(true);
    try {
      const [comps, profiles] = await Promise.all([
        supabase.from("companies").select("id, name, country, plan, status, email, phone, created_at, currency").ilike("name", `%${query}%`).limit(10),
        supabase.from("profiles").select("id, full_name, user_id, company_id, created_at").ilike("full_name", `%${query}%`).limit(10),
      ]);
      if (comps.error) throw comps.error;
      if (profiles.error) throw profiles.error;
      setResults({ companies: comps.data || [], users: profiles.data || [] });
      await logAction("support_search", undefined, undefined, { query });
    } catch (err: any) {
      console.error("Search failed:", err);
      toast({ title: "Search failed", description: err.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const viewCompanyDetail = async (company: any) => {
    setSelectedCompany(company);
    setLoadingDetail(true);
    setCompanyDetail(null);
    try {
      const [products, users, sales, invoices, sub] = await Promise.all([
        supabase.from("products").select("id").eq("company_id", company.id),
        supabase.from("user_roles").select("id, role, user_id, active").eq("company_id", company.id),
        supabase.from("sales").select("total, created_at").eq("company_id", company.id).order("created_at", { ascending: false }).limit(100),
        supabase.from("invoices").select("id, status, total").eq("company_id", company.id),
        supabase.from("subscriptions").select("*").eq("company_id", company.id).maybeSingle(),
      ]);
      setCompanyDetail({
        products: products.data?.length || 0,
        users: users.data?.length || 0,
        activeUsers: (users.data || []).filter(u => u.active).length,
        roles: users.data || [],
        recentSales: sales.data || [],
        salesTotal: (sales.data || []).reduce((s, r) => s + (r.total || 0), 0),
        invoices: invoices.data?.length || 0,
        overdueInvoices: (invoices.data || []).filter(i => i.status === "overdue").length,
        paidInvoices: (invoices.data || []).filter(i => i.status === "paid").length,
        subscription: sub.data,
      });
    } catch (err: any) {
      console.error("Failed to load company detail:", err);
      toast({ title: "Failed to load details", variant: "destructive" });
    } finally {
      setLoadingDetail(false);
    }
  };

  const createTicket = async () => {
    if (!ticketNote.trim()) return;
    try {
      const { error } = await supabase.from("admin_audit_logs").insert({
        action: "support_ticket_created",
        admin_id: adminUser?.id || null,
        admin_email: adminUser?.email || null,
        entity: "support",
        metadata: { subject: ticketSubject || "General", note: ticketNote, company: ticketCompany || undefined, priority: ticketPriority },
      });
      if (error) throw error;
      toast({ title: "Support note saved" });
      setTicketNote("");
      setTicketSubject("");
      setTicketCompany("");
      setTicketPriority("normal");
      loadSupportNotes();
    } catch (err: any) {
      console.error("Failed to create ticket:", err);
      toast({ title: "Failed to save note", description: err.message, variant: "destructive" });
    }
  };

  const getPriorityColor = (p: string) => {
    if (p === "high" || p === "urgent") return "destructive";
    if (p === "low") return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Support Tools</h1>
        <p className="text-sm text-muted-foreground">Search, investigate, and document support issues</p>
      </div>

      <Tabs defaultValue="search" className="space-y-4">
        <TabsList>
          <TabsTrigger value="search">Quick Search</TabsTrigger>
          <TabsTrigger value="notes">Support Notes ({supportNotes.length})</TabsTrigger>
          <TabsTrigger value="create">Create Note</TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2 mb-4">
                <Input placeholder="Search company or user name..." value={query} onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="flex-1" />
                <Button onClick={handleSearch} disabled={searching}>
                  {searching ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                  Search
                </Button>
              </div>

              {searched && (
                <div className="space-y-4">
                  {results.companies.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" /> Companies ({results.companies.length})
                      </h4>
                      <div className="space-y-1.5">
                        {results.companies.map(c => (
                          <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div>
                              <p className="font-medium text-sm">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.email || "No email"} · {c.country} · Since {format(new Date(c.created_at), "MMM yyyy")}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="capitalize">{c.plan}</Badge>
                              <Badge variant={c.status === "active" ? "default" : "destructive"}>{c.status}</Badge>
                              {c.email && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(`mailto:${c.email}`)}>
                                  <Mail className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {c.phone && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(`https://wa.me/${c.phone.replace(/\D/g, "")}`)}>
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => viewCompanyDetail(c)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.users.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" /> Users ({results.users.length})
                      </h4>
                      <div className="space-y-1.5">
                        {results.users.map(u => (
                          <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium text-sm">{u.full_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{u.user_id?.slice(0, 12)}...</p>
                            </div>
                            <p className="text-xs text-muted-foreground">{format(new Date(u.created_at), "dd MMM yyyy")}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.companies.length === 0 && results.users.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No results found for "{query}"</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Support Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-sm">Recent Notes</CardTitle>
              <Button variant="ghost" size="sm" onClick={loadSupportNotes}><RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh</Button>
            </CardHeader>
            <CardContent>
              {supportNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No support notes yet. Create one from the "Create Note" tab.</p>
              ) : (
                <div className="space-y-2">
                  {supportNotes.map(n => {
                    const meta = typeof n.metadata === "string" ? JSON.parse(n.metadata) : (n.metadata || {});
                    return (
                      <div key={n.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium">{n.admin_email || "System"}</span>
                            {meta.subject && <Badge variant="outline" className="text-[10px]">{meta.subject}</Badge>}
                            {meta.priority && meta.priority !== "normal" && (
                              <Badge variant={getPriorityColor(meta.priority)} className="text-[10px] capitalize">{meta.priority}</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(n.created_at), "dd MMM yyyy HH:mm")}
                          </span>
                        </div>
                        <p className="text-sm">{meta.note || "—"}</p>
                        {meta.company && (
                          <p className="text-xs text-muted-foreground mt-1">Company: {meta.company}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Note Tab */}
        <TabsContent value="create">
          <Card>
            <CardHeader><CardTitle className="text-sm">New Support Note</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Subject (optional)" value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} />
                <Select value={ticketPriority} onValueChange={setTicketPriority}>
                  <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="Related company name (optional)" value={ticketCompany} onChange={(e) => setTicketCompany(e.target.value)} />
              <Textarea value={ticketNote} onChange={(e) => setTicketNote(e.target.value)} placeholder="Describe the support issue or resolution..." rows={4} />
              <Button onClick={createTicket} disabled={!ticketNote.trim()}>Save Support Note</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Company Detail Dialog */}
      <Dialog open={!!selectedCompany} onOpenChange={() => { setSelectedCompany(null); setCompanyDetail(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedCompany?.name}
              <Badge variant={selectedCompany?.status === "active" ? "default" : "destructive"}>{selectedCompany?.status}</Badge>
            </DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading details...</div>
          ) : selectedCompany && companyDetail ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-muted-foreground">Plan</label><p className="capitalize font-medium">{selectedCompany.plan}</p></div>
                <div><label className="text-xs text-muted-foreground">Country</label><p>{selectedCompany.country}</p></div>
                <div><label className="text-xs text-muted-foreground">Email</label><p>{selectedCompany.email || "—"}</p></div>
                <div><label className="text-xs text-muted-foreground">Phone</label><p>{selectedCompany.phone || "—"}</p></div>
              </div>

              {/* Quick contact */}
              <div className="flex gap-2">
                {selectedCompany.email && (
                  <Button variant="outline" size="sm" onClick={() => window.open(`mailto:${selectedCompany.email}`)}>
                    <Mail className="h-3.5 w-3.5 mr-1" />Email
                  </Button>
                )}
                {selectedCompany.phone && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => window.open(`tel:${selectedCompany.phone}`)}>
                      <Phone className="h-3.5 w-3.5 mr-1" />Call
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.open(`https://wa.me/${selectedCompany.phone.replace(/\D/g, "")}`)}>
                      <MessageCircle className="h-3.5 w-3.5 mr-1" />WhatsApp
                    </Button>
                  </>
                )}
              </div>

              <div className="border-t pt-3">
                <h4 className="font-medium mb-2">Usage</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">{companyDetail.products}</p>
                    <p className="text-xs text-muted-foreground">Products</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">{companyDetail.activeUsers}/{companyDetail.users}</p>
                    <p className="text-xs text-muted-foreground">Users</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">£{(companyDetail.salesTotal / 100).toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">{companyDetail.paidInvoices}/{companyDetail.invoices}</p>
                    <p className="text-xs text-muted-foreground">Invoices Paid</p>
                  </div>
                </div>
              </div>
              {companyDetail.overdueInvoices > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-xs">
                  <AlertTriangle className="h-4 w-4" />
                  {companyDetail.overdueInvoices} overdue invoice(s)
                </div>
              )}
              {companyDetail.subscription && (
                <div className="border-t pt-3">
                  <h4 className="font-medium mb-1">Subscription</h4>
                  <p className="text-xs">Plan: <span className="capitalize font-medium">{companyDetail.subscription.plan}</span> · Max Products: {companyDetail.subscription.max_products} · Max Users: {companyDetail.subscription.max_users}</p>
                  {companyDetail.subscription.expires_at && (
                    <p className="text-xs mt-1">
                      Expires: <span className={new Date(companyDetail.subscription.expires_at) < new Date() ? "text-destructive font-medium" : ""}>
                        {format(new Date(companyDetail.subscription.expires_at), "dd MMM yyyy")}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
