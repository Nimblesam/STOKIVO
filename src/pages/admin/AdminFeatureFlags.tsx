import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Flag, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AdminFeatureFlags() {
  const { logAction, isSuperAdmin } = useAdminAuth();
  const [flags, setFlags] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyFlags, setCompanyFlags] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [newFlag, setNewFlag] = useState({ flag_key: "", label: "", description: "" });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const [f, c] = await Promise.all([
      supabase.from("feature_flags").select("*").order("flag_key"),
      supabase.from("companies").select("id, name").order("name"),
    ]);
    setFlags(f.data || []);
    setCompanies(c.data || []);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selectedCompany) { setCompanyFlags([]); return; }
    supabase.from("company_feature_flags").select("*").eq("company_id", selectedCompany)
      .then(({ data }) => setCompanyFlags(data || []));
  }, [selectedCompany]);

  const toggleGlobal = async (flag: any) => {
    if (!isSuperAdmin) return;
    const newVal = !flag.enabled_global;
    const { error } = await supabase.from("feature_flags").update({ enabled_global: newVal }).eq("id", flag.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logAction("feature_flag_toggle_global", "feature_flag", flag.id, { flag_key: flag.flag_key, enabled: newVal });
    toast({ title: `${flag.label} ${newVal ? "enabled" : "disabled"} globally` });
    load();
  };

  const toggleCompanyFlag = async (flag: any) => {
    if (!isSuperAdmin || !selectedCompany) return;
    const existing = companyFlags.find(cf => cf.flag_id === flag.id);
    if (existing) {
      const { error } = await supabase.from("company_feature_flags").update({ enabled: !existing.enabled }).eq("id", existing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("company_feature_flags").insert({
        company_id: selectedCompany, flag_id: flag.id, enabled: true,
      });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    await logAction("feature_flag_toggle_company", "feature_flag", flag.id, { company_id: selectedCompany, flag_key: flag.flag_key });
    toast({ title: "Company flag updated" });
    const { data } = await supabase.from("company_feature_flags").select("*").eq("company_id", selectedCompany);
    setCompanyFlags(data || []);
  };

  const createFlag = async () => {
    if (!newFlag.flag_key || !newFlag.label) return;
    setCreating(true);
    const { error } = await supabase.from("feature_flags").insert({
      flag_key: newFlag.flag_key,
      label: newFlag.label,
      description: newFlag.description || null,
      enabled_global: false,
    });
    if (error) {
      toast({ title: "Error creating flag", description: error.message, variant: "destructive" });
      setCreating(false);
      return;
    }
    await logAction("feature_flag_created", "feature_flag", undefined, { flag_key: newFlag.flag_key });
    toast({ title: "Feature flag created" });
    setNewFlag({ flag_key: "", label: "", description: "" });
    setShowCreate(false);
    setCreating(false);
    load();
  };

  const deleteFlag = async (flag: any) => {
    if (!isSuperAdmin) return;
    // Delete company overrides first, then the flag
    await supabase.from("company_feature_flags").delete().eq("flag_id", flag.id);
    const { error } = await supabase.from("feature_flags").delete().eq("id", flag.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logAction("feature_flag_deleted", "feature_flag", flag.id, { flag_key: flag.flag_key });
    toast({ title: "Feature flag deleted" });
    load();
  };

  const isCompanyEnabled = (flagId: string) => {
    const cf = companyFlags.find(c => c.flag_id === flagId);
    return cf?.enabled || false;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feature Flags</h1>
          <p className="text-sm text-muted-foreground">{flags.length} flags configured</p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> New Flag
          </Button>
        )}
      </div>

      {/* Global Flags */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Flag className="h-4 w-4 text-muted-foreground" />
            Global Flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          {flags.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No feature flags configured. Create one to get started.</p>
          ) : (
            <div className="space-y-3">
              {flags.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{f.label}</p>
                      <Badge variant="outline" className="text-[10px] font-mono">{f.flag_key}</Badge>
                    </div>
                    {f.description && <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={f.enabled_global} onCheckedChange={() => toggleGlobal(f)} disabled={!isSuperAdmin} />
                    {isSuperAdmin && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteFlag(f)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-Company Overrides */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Per-Company Overrides</CardTitle>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-52"><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedCompany ? (
            <p className="text-sm text-muted-foreground text-center py-4">Select a company to manage per-company flags</p>
          ) : flags.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No flags to configure</p>
          ) : (
            <div className="space-y-3">
              {flags.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{f.label}</p>
                    <div className="flex gap-1.5 mt-0.5">
                      <Badge variant={f.enabled_global ? "default" : "secondary"} className="text-[10px]">
                        Global: {f.enabled_global ? "ON" : "OFF"}
                      </Badge>
                    </div>
                  </div>
                  <Switch checked={isCompanyEnabled(f.id)} onCheckedChange={() => toggleCompanyFlag(f)} disabled={!isSuperAdmin} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Flag Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Feature Flag</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Flag Key</label>
              <Input placeholder="e.g. pos_enabled" value={newFlag.flag_key} onChange={(e) => setNewFlag(p => ({ ...p, flag_key: e.target.value.toLowerCase().replace(/\s+/g, "_") }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Label</label>
              <Input placeholder="e.g. POS Module" value={newFlag.label} onChange={(e) => setNewFlag(p => ({ ...p, label: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
              <Textarea placeholder="What does this flag control?" value={newFlag.description} onChange={(e) => setNewFlag(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createFlag} disabled={!newFlag.flag_key || !newFlag.label || creating}>
              {creating ? "Creating..." : "Create Flag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
