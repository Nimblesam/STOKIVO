import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Monitor, Loader2, CreditCard, Globe, MapPin } from "lucide-react";
import { PrinterStatusIndicator } from "@/components/PrinterStatusIndicator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type ProviderId = "stripe" | "teya";

export function PosSettingsTab({ companyId }: { companyId?: string }) {
  const [autoOpenDrawer, setAutoOpenDrawer] = useState(true);
  const [paymentProvider, setPaymentProvider] = useState<ProviderId>("stripe");
  const [providerStatus, setProviderStatus] = useState<Record<ProviderId, boolean>>({
    stripe: true,
    teya: false,
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    supabase.from("pos_settings").select("*").eq("company_id", companyId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAutoOpenDrawer(data.auto_open_drawer);
          const provider = (data as { payment_provider?: ProviderId }).payment_provider;
          if (provider === "stripe" || provider === "teya") setPaymentProvider(provider);
        }
        setLoaded(true);
      });

    supabase.functions.invoke("payment-providers-status").then(({ data }) => {
      const items = (data as { providers?: { id: ProviderId; configured: boolean }[] })?.providers;
      if (items) {
        setProviderStatus(items.reduce((acc, p) => {
          acc[p.id] = p.configured;
          return acc;
        }, { stripe: false, teya: false } as Record<ProviderId, boolean>));
      }
    }).catch(() => {/* ignore — falls back to defaults */});
  }, [companyId]);

  const handleSave = async () => {
    if (!companyId) return;
    if (paymentProvider === "teya" && !providerStatus.teya) {
      toast.error("Teya is not yet configured. Add Teya credentials to enable it.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("pos_settings").upsert({
      company_id: companyId,
      auto_open_drawer: autoOpenDrawer,
      payment_provider: paymentProvider,
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

        <div className="rounded-xl bg-muted/50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-accent" />
            <Label className="text-sm font-medium">Default payment provider</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Used for invoice payment links and Tap to Pay at the cashier.
          </p>
          <RadioGroup
            value={paymentProvider}
            onValueChange={(v) => setPaymentProvider(v as ProviderId)}
            className="grid gap-2"
          >
            <label
              htmlFor="provider-stripe"
              className="flex items-start gap-3 rounded-lg border border-border bg-background p-3 cursor-pointer hover:border-accent/50 transition-colors"
            >
              <RadioGroupItem value="stripe" id="provider-stripe" className="mt-1" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">Stripe</span>
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <Globe className="h-3 w-3" /> Global
                  </Badge>
                  {providerStatus.stripe && (
                    <Badge variant="outline" className="text-[10px]">Active</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  International cards and digital wallets. Best for global online payments.
                </p>
              </div>
            </label>

            <label
              htmlFor="provider-teya"
              className="flex items-start gap-3 rounded-lg border border-border bg-background p-3 cursor-pointer hover:border-accent/50 transition-colors"
            >
              <RadioGroupItem value="teya" id="provider-teya" className="mt-1" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">Teya</span>
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <MapPin className="h-3 w-3" /> UK / EU
                  </Badge>
                  {providerStatus.teya ? (
                    <Badge variant="outline" className="text-[10px]">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Setup pending
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Optimised for UK & European businesses. Fast settlement and business-friendly fees.
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>
      </div>

      <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2" disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save POS Settings
      </Button>
    </div>
  );
}
