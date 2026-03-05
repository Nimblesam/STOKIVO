import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

export default function AdminFeatureFlags() {
  const { logAction, isSuperAdmin } = useAdminAuth();
  const [flags, setFlags] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyFlags, setCompanyFlags] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");

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
    if (!selectedCompany) return;
    supabase.from("company_feature_flags").select("*").eq("company_id", selectedCompany)
      .then(({ data }) => setCompanyFlags(data || []));
  }, [selectedCompany]);

  const toggleGlobal = async (flag: any) => {
    if (!isSuperAdmin) return;
    const newVal = !flag.enabled_global;
    await supabase.from("feature_flags").update({ enabled_global: newVal } as any).eq("id", flag.id);
    await logAction("feature_flag_toggle_global", "feature_flag", flag.id, { flag_key: flag.flag_key, enabled: newVal });
    toast({ title: `${flag.label} ${newVal ? "enabled" : "disabled"} globally` });
    load();
  };

  const toggleCompanyFlag = async (flag: any) => {
    if (!isSuperAdmin || !selectedCompany) return;
    const existing = companyFlags.find(cf => cf.flag_id === flag.id);
    if (existing) {
      await supabase.from("company_feature_flags").update({ enabled: !existing.enabled } as any).eq("id", existing.id);
    } else {
      await supabase.from("company_feature_flags").insert({
        company_id: selectedCompany, flag_id: flag.id, enabled: true,
      } as any);
    }
    await logAction("feature_flag_toggle_company", "feature_flag", flag.id, { company_id: selectedCompany, flag_key: flag.flag_key });
    toast({ title: "Company flag updated" });
    const { data } = await supabase.from("company_feature_flags").select("*").eq("company_id", selectedCompany);
    setCompanyFlags(data || []);
  };

  const isCompanyEnabled = (flagId: string) => {
    const cf = companyFlags.find(c => c.flag_id === flagId);
    return cf?.enabled || false;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Feature Flags</h1>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-sm">Global Flags</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {flags.map((f) => (
              <div key={f.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.description}</p>
                </div>
                <Switch checked={f.enabled_global} onCheckedChange={() => toggleGlobal(f)} disabled={!isSuperAdmin} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Per-Company Overrides</CardTitle>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Select company" /></SelectTrigger>
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
            <p className="text-sm text-muted-foreground">Select a company to manage flags</p>
          ) : (
            <div className="space-y-3">
              {flags.map((f) => (
                <div key={f.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{f.label}</p>
                    <Badge variant={f.enabled_global ? "default" : "secondary"} className="text-[10px]">
                      Global: {f.enabled_global ? "ON" : "OFF"}
                    </Badge>
                  </div>
                  <Switch checked={isCompanyEnabled(f.id)} onCheckedChange={() => toggleCompanyFlag(f)} disabled={!isSuperAdmin} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
