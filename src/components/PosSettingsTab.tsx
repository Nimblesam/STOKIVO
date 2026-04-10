import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Monitor, Loader2 } from "lucide-react";
import { PrinterStatusIndicator } from "@/components/PrinterStatusIndicator";
import { toast } from "sonner";

export function PosSettingsTab({ companyId }: { companyId?: string }) {
  const [autoOpenDrawer, setAutoOpenDrawer] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    supabase.from("pos_settings").select("*").eq("company_id", companyId).maybeSingle()
      .then(({ data }) => {
        if (data) setAutoOpenDrawer(data.auto_open_drawer);
        setLoaded(true);
      });
  }, [companyId]);

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);
    const { error } = await supabase.from("pos_settings").upsert({
      company_id: companyId,
      auto_open_drawer: autoOpenDrawer,
    } as any, { onConflict: "company_id" });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("POS settings saved!");
  };

  if (!loaded) return null;

  return (
    <div className="stokivo-card p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Monitor className="h-5 w-5 text-accent" />
        <div>
          <h3 className="font-display font-semibold text-foreground">POS Settings</h3>
          <p className="text-sm text-muted-foreground">Configure your point-of-sale hardware</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
          <div>
            <Label className="text-sm font-medium">Auto-open cash drawer on cash payment</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Automatically triggers the cash drawer when a cash payment is processed</p>
          </div>
          <Switch checked={autoOpenDrawer} onCheckedChange={setAutoOpenDrawer} />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
          <div>
            <Label className="text-sm font-medium">Receipt Printer</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Connect an ESC/POS compatible receipt printer via USB</p>
          </div>
          <PrinterStatusIndicator />
        </div>
      </div>

      <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2" disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save POS Settings
      </Button>
    </div>
  );
}
