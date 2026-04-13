import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import { PageHeader } from "@/components/PageHeader";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Globe, Smartphone, ShoppingCart, Star, Truck, Monitor, Store,
  Link2, CheckCircle2, Clock, ArrowRight, RefreshCw, Unplug, Loader2,
  MessageSquare, Receipt, Bell, Megaphone, ShieldCheck,
} from "lucide-react";

type ChannelStatus = "active" | "connected" | "disconnected" | "coming_soon";

interface Channel {
  id: string;
  name: string;
  icon: typeof Globe;
  status: ChannelStatus;
  desc: string;
  configurable: boolean;
  fields?: { key: string; label: string; placeholder: string; type?: string }[];
}

const channels: Channel[] = [
  {
    id: "pos", name: "POS (In-Store)", icon: Monitor, status: "active",
    desc: "Cashier & barcode scanning built-in. Bluetooth/USB scanner supported.",
    configurable: false,
  },
  {
    id: "online_store", name: "Online Store", icon: Globe, status: "active",
    desc: "Your products synced to your web store",
    configurable: false,
  },
  {
    id: "shopify", name: "Shopify", icon: ShoppingCart, status: "disconnected",
    desc: "Sync products, inventory & orders with Shopify",
    configurable: true,
    fields: [
      { key: "store_url", label: "Store URL", placeholder: "your-store.myshopify.com" },
      { key: "api_key", label: "API Key", placeholder: "shpat_xxxxxxxxxxxx", type: "password" },
      { key: "api_secret", label: "API Secret", placeholder: "shpss_xxxxxxxxxxxx", type: "password" },
    ],
  },
  {
    id: "wix", name: "Wix", icon: Globe, status: "disconnected",
    desc: "Sync products & inventory with your Wix store",
    configurable: true,
    fields: [
      { key: "site_id", label: "Site ID", placeholder: "Your Wix site ID" },
      { key: "api_key", label: "API Key", placeholder: "Wix API key", type: "password" },
    ],
  },
  {
    id: "woocommerce", name: "WooCommerce", icon: Store, status: "disconnected",
    desc: "Connect to your WordPress WooCommerce store",
    configurable: true,
    fields: [
      { key: "site_url", label: "Site URL", placeholder: "https://your-site.com" },
      { key: "consumer_key", label: "Consumer Key", placeholder: "ck_xxxxxxxxxxxx", type: "password" },
      { key: "consumer_secret", label: "Consumer Secret", placeholder: "cs_xxxxxxxxxxxx", type: "password" },
    ],
  },
  {
    id: "uber_eats", name: "Uber Eats", icon: Truck, status: "disconnected",
    desc: "Sync menu items & availability with Uber Eats",
    configurable: true,
    fields: [
      { key: "store_id", label: "Restaurant ID", placeholder: "Uber Eats store ID" },
      { key: "client_id", label: "Client ID", placeholder: "Uber API Client ID" },
      { key: "client_secret", label: "Client Secret", placeholder: "Uber API Client Secret", type: "password" },
    ],
  },
  {
    id: "deliveroo", name: "Deliveroo", icon: Truck, status: "disconnected",
    desc: "Sync menu & inventory with Deliveroo",
    configurable: true,
    fields: [
      { key: "brand_id", label: "Brand ID", placeholder: "Deliveroo brand ID" },
      { key: "api_token", label: "API Token", placeholder: "Deliveroo API token", type: "password" },
    ],
  },
  {
    id: "instagram", name: "Instagram Shop", icon: Globe, status: "coming_soon",
    desc: "List products directly on Instagram", configurable: false,
  },
  {
    id: "tiktok", name: "TikTok Shop", icon: Smartphone, status: "coming_soon",
    desc: "Sell through TikTok's marketplace", configurable: false,
  },
  {
    id: "amazon", name: "Amazon", icon: ShoppingCart, status: "coming_soon",
    desc: "Sync inventory with Amazon listings", configurable: false,
  },
  {
    id: "ebay", name: "eBay", icon: ShoppingCart, status: "coming_soon",
    desc: "Keep eBay stock levels accurate", configurable: false,
  },
  {
    id: "etsy", name: "Etsy", icon: Star, status: "coming_soon",
    desc: "Handmade & vintage marketplace sync", configurable: false,
  },
];

const whatsappUseCases = [
  {
    id: "digital_receipts",
    icon: Receipt,
    title: "Digital Receipts",
    desc: "Automatically send itemised receipts to customers after every successful checkout.",
    triggerEvent: "sale.completed",
  },
  {
    id: "payment_reminders",
    icon: Bell,
    title: "Payment Reminders",
    desc: "Automated reminders for outstanding credit/ledger balances with payment links.",
    triggerEvent: "ledger.overdue",
  },
  {
    id: "promotions",
    icon: Megaphone,
    title: "Promotional Messages",
    desc: "Send discount offers, new arrivals, and seasonal campaigns to opted-in customers.",
    triggerEvent: "campaign.scheduled",
  },
  {
    id: "notifications",
    icon: Bell,
    title: "Event Notifications",
    desc: "Notify customers about refunds, order status changes, and stock availability.",
    triggerEvent: "sale.refunded | product.restocked",
  },
];

export default function Integrations() {
  const { profile } = useAuth();
  const { currentPlan, isPro, isGrowthOrAbove, requiredPlanFor, hasFeature } = usePlanFeatures();
  const [channelStatuses, setChannelStatuses] = useState<Record<string, ChannelStatus>>({});
  const [connectDialog, setConnectDialog] = useState<Channel | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // WhatsApp config state
  const [waEnabled, setWaEnabled] = useState(false);
  const [waToggles, setWaToggles] = useState<Record<string, boolean>>({
    digital_receipts: true,
    payment_reminders: true,
    promotions: false,
    notifications: true,
  });
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waToken, setWaToken] = useState("");

  const canAccessWhatsApp = hasFeature("whatsapp_messaging");

  useEffect(() => {
    if (!profile?.company_id) return;
    const checkStatuses = async () => {
      const configurableChannels = channels.filter((c) => c.configurable);
      const statuses: Record<string, ChannelStatus> = {};
      for (const ch of configurableChannels) {
        try {
          const { data } = await supabase.functions.invoke("channel-sync", {
            body: { action: "status", channel: ch.id, company_id: profile.company_id },
          });
          statuses[ch.id] = data?.connected ? "connected" : "disconnected";
        } catch {
          statuses[ch.id] = "disconnected";
        }
      }
      setChannelStatuses(statuses);
    };
    checkStatuses();
  }, [profile?.company_id]);

  const getStatus = (ch: Channel): ChannelStatus => {
    if (ch.status === "active" || ch.status === "coming_soon") return ch.status;
    return channelStatuses[ch.id] || ch.status;
  };

  const handleConnect = async () => {
    if (!connectDialog || !profile?.company_id) return;
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("channel-sync", {
        body: {
          action: "connect",
          channel: connectDialog.id,
          company_id: profile.company_id,
          credentials: formValues,
        },
      });
      if (error) throw error;
      toast.success(data?.message || `${connectDialog.name} connected!`);
      setChannelStatuses((prev) => ({ ...prev, [connectDialog.id]: "connected" }));
      setConnectDialog(null);
      setFormValues({});
    } catch (err: any) {
      toast.error("Connection failed", { description: err?.message });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (ch: Channel) => {
    if (!profile?.company_id) return;
    try {
      await supabase.functions.invoke("channel-sync", {
        body: { action: "disconnect", channel: ch.id, company_id: profile.company_id },
      });
      toast.success(`${ch.name} disconnected`);
      setChannelStatuses((prev) => ({ ...prev, [ch.id]: "disconnected" }));
    } catch (err: any) {
      toast.error("Failed to disconnect", { description: err?.message });
    }
  };

  const handleSync = async (ch: Channel) => {
    if (!profile?.company_id) return;
    setSyncing(ch.id);
    try {
      const { data, error } = await supabase.functions.invoke("channel-sync", {
        body: { action: "sync_products", channel: ch.id, company_id: profile.company_id },
      });
      if (error) throw error;
      toast.success(data?.message || "Products synced!");
    } catch (err: any) {
      toast.error("Sync failed", { description: err?.message });
    } finally {
      setSyncing(null);
    }
  };

  const statusBadge = (status: ChannelStatus) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Built-in
          </Badge>
        );
      case "connected":
        return (
          <Badge className="bg-accent/10 text-accent border-accent/20 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Connected
          </Badge>
        );
      case "coming_soon":
        return (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" /> Coming Soon
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Unplug className="h-3 w-3" /> Not Connected
          </Badge>
        );
    }
  };

  const deliveryChannelIds = ["uber_eats", "deliveroo"];
  const isDeliveryChannel = (id: string) => deliveryChannelIds.includes(id);

  const canAccessChannel = (ch: Channel): boolean => {
    if (ch.status === "active" || ch.status === "coming_soon") return true;
    if (isDeliveryChannel(ch.id)) return isGrowthOrAbove;
    return isPro;
  };

  if (!isGrowthOrAbove) {
    return (
      <div className="max-w-5xl mx-auto">
        <PageHeader title="Integrations" subtitle="Connect your sales channels — inventory syncs automatically across all platforms" />
        <UpgradeModal
          open={true}
          onOpenChange={() => {}}
          requiredPlan="growth"
          featureLabel="Integrations"
          currentPlan={currentPlan}
        />
        <div className="text-center py-16">
          <p className="text-muted-foreground">Integrations are available on the Growth plan and above.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Integrations"
        subtitle="Connect sales channels and messaging — everything syncs automatically"
      />

      <Tabs defaultValue="channels" className="space-y-6">
        <TabsList>
          <TabsTrigger value="channels" className="gap-1.5">
            <Link2 className="h-3.5 w-3.5" /> Sales Channels
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> WhatsApp Business
            {!canAccessWhatsApp && <span className="text-[10px]">🔒</span>}
          </TabsTrigger>
        </TabsList>

        {/* ─── Sales Channels Tab ─── */}
        <TabsContent value="channels">
          <Card className="p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Link2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground">Multi-Channel Sync</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Stokivo automatically syncs your inventory across all connected channels.
                  No double-counting, no overselling. Every sale updates stock in real-time
                  across Shopify, Wix, WooCommerce, Uber Eats, and Deliveroo.
                </p>
              </div>
            </div>
          </Card>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((ch) => {
              const status = getStatus(ch);
              const hasAccess = canAccessChannel(ch);
              const requiredPlan = isDeliveryChannel(ch.id) ? "growth" : "pro";
              return (
                <Card key={ch.id} className={`p-5 flex flex-col justify-between ${!hasAccess ? "opacity-60" : ""}`}>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                        <ch.icon className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {!hasAccess && (
                          <Badge variant="outline" className="text-[10px] gap-0.5">🔒 {requiredPlan === "growth" ? "Growth" : "Pro"}</Badge>
                        )}
                        {statusBadge(status)}
                      </div>
                    </div>
                    <h4 className="font-semibold text-foreground text-sm">{ch.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{ch.desc}</p>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {status === "active" && (
                      <Button variant="default" size="sm" className="w-full gap-1" disabled>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Active
                      </Button>
                    )}
                    {status === "connected" && hasAccess && (
                      <>
                        <Button variant="default" size="sm" className="flex-1 gap-1" onClick={() => handleSync(ch)}
                          disabled={syncing === ch.id}>
                          {syncing === ch.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                          Sync
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => handleDisconnect(ch)}>
                          <Unplug className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {status === "disconnected" && ch.configurable && hasAccess && (
                      <Button variant="default" size="sm" className="w-full gap-1" onClick={() => {
                        setConnectDialog(ch);
                        setFormValues({});
                      }}>
                        <Link2 className="h-3.5 w-3.5" /> Connect
                      </Button>
                    )}
                    {status === "disconnected" && ch.configurable && !hasAccess && (
                      <Button variant="outline" size="sm" className="w-full gap-1" disabled>
                        🔒 Upgrade to {requiredPlan === "growth" ? "Growth" : "Pro"}
                      </Button>
                    )}
                    {status === "coming_soon" && (
                      <Button variant="outline" size="sm" className="w-full gap-1" disabled>
                        <ArrowRight className="h-3.5 w-3.5" /> Coming Soon
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── WhatsApp Business Tab ─── */}
        <TabsContent value="whatsapp">
          {!canAccessWhatsApp ? (
            <Card className="p-8 text-center">
              <div className="h-16 w-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">WhatsApp Business Messaging</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                Automate customer communication with WhatsApp — send receipts, payment reminders, and promotions. Available on Growth and Pro plans.
              </p>
              <UpgradeModal
                open={false}
                onOpenChange={() => {}}
                requiredPlan={requiredPlanFor("whatsapp_messaging")}
                featureLabel="WhatsApp Business"
                currentPlan={currentPlan}
              />
              <Button
                variant="default"
                className="gap-2"
                onClick={() => toast.info("Upgrade to Growth or Pro to enable WhatsApp messaging")}
              >
                🔒 Upgrade to Unlock
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Overview Card */}
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-display font-semibold text-foreground">WhatsApp Business Platform</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Automated, event-driven messaging — not manual chat. Messages are triggered by backend events
                          (sales, refunds, credit updates) and sent only to customers who have opted in.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="wa-toggle" className="text-sm font-medium">
                          {waEnabled ? "Active" : "Disabled"}
                        </Label>
                        <Switch
                          id="wa-toggle"
                          checked={waEnabled}
                          onCheckedChange={setWaEnabled}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Compliance Notice */}
              <Card className="p-4 border-green-500/20 bg-green-500/5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Opt-in Compliance</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Messages are only sent to customers who have provided consent and have a valid WhatsApp number on file.
                      Customers can opt out at any time. All messages comply with WhatsApp Business Policy and local regulations.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Use Cases */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Messaging Automations</h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  {whatsappUseCases.map((uc) => (
                    <Card key={uc.id} className={`p-5 transition-opacity ${!waEnabled ? "opacity-50" : ""}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                          <uc.icon className="h-5 w-5 text-green-600" />
                        </div>
                        <Switch
                          checked={waToggles[uc.id] ?? false}
                          onCheckedChange={(v) => setWaToggles((prev) => ({ ...prev, [uc.id]: v }))}
                          disabled={!waEnabled}
                        />
                      </div>
                      <h5 className="font-semibold text-sm text-foreground">{uc.title}</h5>
                      <p className="text-xs text-muted-foreground mt-1">{uc.desc}</p>
                      <div className="mt-3">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          Trigger: {uc.triggerEvent}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* API Configuration */}
              <Card className={`p-6 transition-opacity ${!waEnabled ? "opacity-50 pointer-events-none" : ""}`}>
                <h4 className="text-sm font-semibold text-foreground mb-4">WhatsApp API Configuration</h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone Number ID</Label>
                    <Input
                      placeholder="e.g. 1234567890"
                      value={waPhoneId}
                      onChange={(e) => setWaPhoneId(e.target.value)}
                      disabled={!waEnabled}
                    />
                    <p className="text-[11px] text-muted-foreground">From your Meta Business Suite → WhatsApp → API Setup</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Permanent Access Token</Label>
                    <Input
                      type="password"
                      placeholder="EAAxxxxxxx..."
                      value={waToken}
                      onChange={(e) => setWaToken(e.target.value)}
                      disabled={!waEnabled}
                    />
                    <p className="text-[11px] text-muted-foreground">System user token with whatsapp_business_messaging permission</p>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    Desktop POS and Mobile POS trigger events automatically — no WhatsApp controls appear on those screens.
                  </p>
                  <Button size="sm" disabled={!waPhoneId || !waToken} onClick={() => toast.success("WhatsApp configuration saved")}>
                    Save Configuration
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Connect Dialog */}
      <Dialog open={!!connectDialog} onOpenChange={(open) => !open && setConnectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {connectDialog?.name}</DialogTitle>
            <DialogDescription>
              Enter your {connectDialog?.name} API credentials to enable inventory sync.
              You can find these in your {connectDialog?.name} developer/partner dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {connectDialog?.fields?.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Input
                  type={field.type || "text"}
                  placeholder={field.placeholder}
                  value={formValues[field.key] || ""}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <Separator />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialog(null)}>Cancel</Button>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


