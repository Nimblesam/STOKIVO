import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/currency";
import { PLANS, STRIPE_PRICES } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2, Users, CreditCard, Globe, Check, Loader2, Banknote, ExternalLink, Star, Crown, Zap,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import type { Currency } from "@/lib/types";

export default function Settings() {
  const { company, profile, user, refreshProfile } = useAuth();
  const currency = (company?.currency || "GBP") as Currency;
  const [saving, setSaving] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [managingPortal, setManagingPortal] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: "", address: "", country: "", currency: "GBP", brand_color: "#0d9488",
    business_type: "wholesale", company_number: "", phone: "", email: "", custom_domain: "",
  });
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const isPro = company?.plan === "pro";

  useEffect(() => {
    if (company) {
      supabase.from("companies").select("*").eq("id", company.id).single().then(({ data }) => {
        if (data) {
          setCompanyForm({
            name: data.name || "", address: data.address || "", country: data.country || "UK",
            currency: data.currency || "GBP", brand_color: data.brand_color || "#0d9488",
            business_type: data.business_type || "wholesale",
            company_number: (data as any).company_number || "", phone: (data as any).phone || "",
            email: (data as any).email || "", custom_domain: (data as any).custom_domain || "",
          });
        }
      });
      supabase.from("user_roles").select("user_id, role, active").eq("company_id", company.id)
        .then(async ({ data: roles }) => {
          if (!roles) return;
          const { data: profiles } = await supabase.from("profiles")
            .select("user_id, full_name, avatar_url").in("user_id", roles.map((r) => r.user_id));
          setTeamMembers(roles.map((r) => {
            const p = profiles?.find((pr) => pr.user_id === r.user_id);
            return { ...r, name: p?.full_name || "Unknown", avatar_url: p?.avatar_url };
          }));
        });
    }
  }, [company]);

  const handleSaveCompany = async () => {
    if (!company) return;
    setSaving(true);
    const { error } = await supabase.from("companies").update({
      name: companyForm.name, address: companyForm.address, country: companyForm.country,
      currency: companyForm.currency as any, brand_color: companyForm.brand_color,
      business_type: companyForm.business_type as any,
      company_number: companyForm.company_number || null,
      phone: companyForm.phone || null, email: companyForm.email || null,
    } as any).eq("id", company.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Company details saved!"); await refreshProfile(); }
  };

  const handleSaveDomain = async () => {
    if (!company || !isPro) return;
    setSaving(true);
    const { error } = await supabase.from("companies")
      .update({ custom_domain: companyForm.custom_domain || null } as any).eq("id", company.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Subdomain saved!");
  };

  const handleSubscribe = async (tier: string) => {
    const priceId = STRIPE_PRICES[tier as keyof typeof STRIPE_PRICES]?.gbp;
    if (!priceId) {
      toast.error("Price not configured for this plan.");
      return;
    }
    setCheckingOut(tier);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to create checkout");
    } finally {
      setCheckingOut(null);
    }
  };

  const handleManageSubscription = async () => {
    setManagingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to open portal");
    } finally {
      setManagingPortal(false);
    }
  };

  const planIcons = { starter: Zap, growth: Star, pro: Crown };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Settings" subtitle="Manage your company, billing, and integrations" />

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="company" className="gap-2"><Building2 className="h-4 w-4" /> Company</TabsTrigger>
          <TabsTrigger value="team" className="gap-2"><Users className="h-4 w-4" /> Team</TabsTrigger>
          <TabsTrigger value="payments" className="gap-2"><Banknote className="h-4 w-4" /> Payments</TabsTrigger>
          <TabsTrigger value="domain" className="gap-2"><Globe className="h-4 w-4" /> Domain</TabsTrigger>
          <TabsTrigger value="billing" className="gap-2"><CreditCard className="h-4 w-4" /> Billing</TabsTrigger>
        </TabsList>

        {/* COMPANY TAB */}
        <TabsContent value="company">
          <div className="zentra-card p-6 space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-xl bg-accent/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-accent" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-foreground">{companyForm.name || "Your Company"}</h3>
                <p className="text-sm text-muted-foreground">{companyForm.address || "No address set"}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Company Name</Label><Input value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} className="mt-1" /></div>
              <div><Label>Company Number</Label><Input value={companyForm.company_number} onChange={(e) => setCompanyForm({ ...companyForm, company_number: e.target.value })} placeholder="e.g. 12345678" className="mt-1" /></div>
              <div><Label>Phone</Label><Input value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} className="mt-1" /></div>
              <div><Label>Email</Label><Input type="email" value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} className="mt-1" /></div>
              <div className="sm:col-span-2"><Label>Address</Label><Input value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} className="mt-1" /></div>
              <div>
                <Label>Country</Label>
                <select value={companyForm.country} onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value, currency: e.target.value === "Nigeria" ? "NGN" : "GBP" })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="UK">United Kingdom</option><option value="Nigeria">Nigeria</option>
                </select>
              </div>
              <div>
                <Label>Business Type</Label>
                <select value={companyForm.business_type} onChange={(e) => setCompanyForm({ ...companyForm, business_type: e.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="wholesale">Wholesale</option><option value="retail">Retail</option><option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <Label>Brand Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="color" value={companyForm.brand_color} onChange={(e) => setCompanyForm({ ...companyForm, brand_color: e.target.value })} className="w-12 h-10 p-1 cursor-pointer" />
                  <Input value={companyForm.brand_color} onChange={(e) => setCompanyForm({ ...companyForm, brand_color: e.target.value })} className="flex-1" />
                </div>
              </div>
            </div>
            <Button onClick={handleSaveCompany} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Changes
            </Button>
          </div>
        </TabsContent>

        {/* TEAM TAB */}
        <TabsContent value="team">
          <div className="zentra-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-semibold text-foreground">Team Members</h3>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"><Users className="h-4 w-4" /> Invite User</Button>
            </div>
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.user_id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                  <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center text-xs font-semibold text-accent">
                    {member.name.split(" ").map((n: string) => n[0]).join("")}
                  </div>
                  <div className="flex-1"><p className="text-sm font-medium text-foreground">{member.name}</p></div>
                  <span className="text-xs font-medium text-muted-foreground capitalize bg-muted px-2 py-1 rounded">{member.role}</span>
                  <StatusBadge status={member.active ? "active" : "inactive"} />
                </div>
              ))}
              {teamMembers.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No team members found</p>}
            </div>
          </div>
        </TabsContent>

        {/* PAYMENTS TAB — Stripe Connect */}
        <TabsContent value="payments">
          <div className="space-y-6">
            <div className="zentra-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Banknote className="h-5 w-5 text-accent" />
                <div>
                  <h3 className="font-display font-semibold text-foreground">Payment Gateway</h3>
                  <p className="text-sm text-muted-foreground">Connect your bank account to receive customer payments directly</p>
                </div>
              </div>
              <Separator className="my-4" />

              <div className="space-y-4">
                {/* Stripe Connect */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[hsl(250,60%,50%)]/10 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-[hsl(250,60%,50%)]" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Stripe Connect</p>
                      <p className="text-xs text-muted-foreground">Accept card, Apple Pay, Google Pay • UK & Global</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>

                {/* Paystack */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20 opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Banknote className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Paystack</p>
                      <p className="text-xs text-muted-foreground">Accept payments in Nigeria</p>
                    </div>
                  </div>
                  <Badge variant="outline">Future</Badge>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-accent/5 border border-accent/20">
                <h4 className="text-sm font-semibold text-foreground mb-2">How payments work</h4>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>1. Connect your Stripe account to receive payments</p>
                  <p>2. Send payment links to customers for invoices</p>
                  <p>3. Customer pays → funds go directly to your bank</p>
                  <p>4. Platform fee: <strong className="text-foreground">0.5%</strong> per transaction</p>
                </div>
              </div>
            </div>

            {/* Fee breakdown example */}
            <div className="zentra-card p-6">
              <h3 className="font-display font-semibold text-foreground mb-4">Payment Fee Example</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Customer pays</span><span className="font-medium">£100.00</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Stripe processing fee (~1.4%)</span><span className="text-destructive">-£1.40</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Platform fee (0.5%)</span><span className="text-destructive">-£0.50</span></div>
                <Separator />
                <div className="flex justify-between font-bold"><span>You receive</span><span className="text-success">£98.10</span></div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* DOMAIN TAB */}
        <TabsContent value="domain">
          <div className="zentra-card p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="h-5 w-5 text-accent" />
              <div>
                <h3 className="font-display font-semibold text-foreground">Custom Subdomain</h3>
                <p className="text-sm text-muted-foreground">{isPro ? "Set a custom subdomain for your workspace" : "Upgrade to Pro to unlock custom subdomains"}</p>
              </div>
            </div>
            {!isPro && (
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-sm text-warning-foreground">
                <strong>Pro plan required.</strong> Custom subdomains are only available on the Pro plan.
              </div>
            )}
            <div>
              <Label>Subdomain</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input value={companyForm.custom_domain} onChange={(e) => setCompanyForm({ ...companyForm, custom_domain: e.target.value })} placeholder="your-business" className="flex-1" disabled={!isPro} />
                <span className="text-sm text-muted-foreground whitespace-nowrap">.zentra.app</span>
              </div>
              {companyForm.custom_domain && isPro && (
                <p className="text-xs text-muted-foreground mt-2">Your workspace: <code className="bg-muted px-1 py-0.5 rounded text-xs">{companyForm.custom_domain}.zentra.app</code></p>
              )}
            </div>
            <Button onClick={handleSaveDomain} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2" disabled={saving || !isPro}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Subdomain
            </Button>
          </div>
        </TabsContent>

        {/* BILLING TAB */}
        <TabsContent value="billing">
          <div className="space-y-6">
            <div className="zentra-card p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-accent" />
                  <div>
                    <h3 className="font-display font-semibold text-foreground">Current Plan: <span className="text-accent">{(company?.plan || "starter").toUpperCase()}</span></h3>
                    <p className="text-sm text-muted-foreground">Your plan renews monthly</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleManageSubscription} disabled={managingPortal}>
                  {managingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  Manage Subscription
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map((plan) => {
                const isCurrent = plan.tier === (company?.plan || "starter");
                const Icon = planIcons[plan.tier as keyof typeof planIcons] || Zap;
                const isPopular = plan.tier === "growth";
                return (
                  <div key={plan.tier} className={`zentra-card p-6 relative ${isCurrent ? "border-accent border-2" : ""} ${isPopular ? "ring-2 ring-accent/20" : ""}`}>
                    {isPopular && (
                      <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">Most Popular</Badge>
                    )}
                    {isCurrent && (
                      <Badge className="absolute -top-2.5 right-4 bg-accent text-accent-foreground">Your Plan</Badge>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="h-5 w-5 text-accent" />
                      <h4 className="font-display font-bold text-lg text-foreground">{plan.name}</h4>
                    </div>
                    <p className="text-3xl font-display font-bold text-foreground">
                      {formatMoney(plan.price[currency as "GBP" | "NGN"], currency as "GBP" | "NGN")}
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </p>
                    <ul className="mt-4 space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-3.5 w-3.5 text-accent shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full mt-6"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent || checkingOut === plan.tier}
                      onClick={() => handleSubscribe(plan.tier)}
                    >
                      {checkingOut === plan.tier ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing…</>
                      ) : isCurrent ? "Current Plan" : "Upgrade"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
