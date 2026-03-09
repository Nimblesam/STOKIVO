import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/currency";
import { PLANS, STRIPE_PRICES } from "@/lib/demo-data";
import { validateEmail, validateAddress } from "@/lib/validation";
import { FieldError } from "@/components/FieldError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Building2, Users, CreditCard, Globe, Check, Loader2, Banknote, ExternalLink, Star, Crown, Zap, Plus, UserPlus,
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
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [inviting, setInviting] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean; charges_enabled?: boolean; payouts_enabled?: boolean; details_submitted?: boolean;
  } | null>(null);
  const [loadingStripeStatus, setLoadingStripeStatus] = useState(false);
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

  // Fetch Stripe Connect status
  useEffect(() => {
    if (!company) return;
    setLoadingStripeStatus(true);
    supabase.functions.invoke("stripe-connect-status").then(({ data, error }) => {
      if (error) {
        toast.error(error.message || "Failed to check Stripe status");
        setStripeStatus(null);
      } else if (data) {
        setStripeStatus(data);
      }
      setLoadingStripeStatus(false);
    });
  }, [company]);

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to start Stripe Connect onboarding");
    } finally { setConnectingStripe(false); }
  };

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  const handleSaveCompany = async () => {
    if (!company) return;
    const emailErr = validateEmail(companyForm.email);
    const addrErr = validateAddress(companyForm.address);
    setFieldErrors({ email: emailErr, address: addrErr });
    if (emailErr || addrErr) { toast.error("Please fix validation errors"); return; }
    const { error } = await supabase.from("companies").update({
      name: companyForm.name, address: companyForm.address, country: companyForm.country,
      currency: companyForm.currency as any, brand_color: companyForm.brand_color,
      business_type: companyForm.business_type as any,
      company_number: companyForm.company_number || null,
      phone: companyForm.phone || null, email: companyForm.email || null,
    } as any).eq("id", company.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Company details saved!");
      await refreshProfile();
      // Apply brand color to CSS
      document.documentElement.style.setProperty("--brand-color", companyForm.brand_color);
    }
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

  const handleInviteUser = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      toast.error("Email is required");
      return;
    }
    const emailErr = validateEmail(email) ? null : null;
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!company) return;

    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("team-invite", {
        body: { email, role: inviteRole },
      });
      if (error) throw error;

      toast.success("Invitation email sent", {
        description: data?.mode === "magiclink"
          ? "They'll receive a sign-in link and be added to your team automatically."
          : "They'll receive an invite email to join your workspace.",
        duration: 6000,
      });

      setShowInvite(false);
      setInviteEmail("");
    } catch (err: any) {
      toast.error(err?.context?.error || err.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleSubscribe = async (tier: string) => {
    const priceId = STRIPE_PRICES[tier as keyof typeof STRIPE_PRICES]?.gbp;
    if (!priceId) { toast.error("Price not configured for this plan."); return; }
    setCheckingOut(tier);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { priceId } });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to create checkout");
    } finally { setCheckingOut(null); }
  };

  const handleManageSubscription = async () => {
    setManagingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to open portal");
    } finally { setManagingPortal(false); }
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
              <div className="h-16 w-16 rounded-xl flex items-center justify-center" style={{ backgroundColor: companyForm.brand_color + "20" }}>
                <Building2 className="h-8 w-8" style={{ color: companyForm.brand_color }} />
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
              <div>
                <Label>Email</Label>
                <Input type="email" value={companyForm.email} onChange={(e) => { setCompanyForm({ ...companyForm, email: e.target.value }); setFieldErrors(f => ({ ...f, email: null })); }} className={`mt-1 ${fieldErrors.email ? "border-destructive" : ""}`} />
                <FieldError message={fieldErrors.email} />
              </div>
              <div className="sm:col-span-2">
                <Label>Address</Label>
                <Input value={companyForm.address} onChange={(e) => { setCompanyForm({ ...companyForm, address: e.target.value }); setFieldErrors(f => ({ ...f, address: null })); }} className={`mt-1 ${fieldErrors.address ? "border-destructive" : ""}`} maxLength={500} />
                <FieldError message={fieldErrors.address} />
              </div>
              <div>
                <Label>Country</Label>
                <select value={companyForm.country} onChange={(e) => {
                  const c = e.target.value;
                  const currMap: Record<string, string> = { "UK": "GBP", "Nigeria": "NGN", "USA": "USD", "Canada": "CAD", "Ghana": "GHS", "Kenya": "KES", "South Africa": "ZAR", "India": "INR", "UAE": "AED", "Australia": "AUD", "EU": "EUR" };
                  setCompanyForm({ ...companyForm, country: c, currency: currMap[c] || "USD" });
                }} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="UK">United Kingdom</option><option value="Nigeria">Nigeria</option><option value="USA">United States</option><option value="Canada">Canada</option><option value="Ghana">Ghana</option><option value="Kenya">Kenya</option><option value="South Africa">South Africa</option><option value="India">India</option><option value="UAE">UAE</option><option value="Australia">Australia</option><option value="EU">European Union</option>
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
                  <div className="relative">
                    <Input type="color" value={companyForm.brand_color} onChange={(e) => setCompanyForm({ ...companyForm, brand_color: e.target.value })} className="w-12 h-10 p-1 cursor-pointer border-2" />
                  </div>
                  <Input value={companyForm.brand_color} onChange={(e) => setCompanyForm({ ...companyForm, brand_color: e.target.value })} className="flex-1" />
                  <div className="h-10 w-10 rounded-md border" style={{ backgroundColor: companyForm.brand_color }} />
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
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2" onClick={() => setShowInvite(true)}>
                <UserPlus className="h-4 w-4" /> Invite User
              </Button>
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

        {/* PAYMENTS TAB */}
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

              {/* Stripe Connect Status */}
              {loadingStripeStatus ? (
                <div className="p-4 rounded-lg border bg-muted/20 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Checking Stripe Connect status...</span>
                </div>
              ) : stripeStatus?.connected && stripeStatus.details_submitted ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border-2 border-green-500/30 bg-green-500/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <Check className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Stripe Connect Active</p>
                          <p className="text-xs text-muted-foreground">
                            Charges: {stripeStatus.charges_enabled ? "✅ Enabled" : "⏳ Pending"} • Payouts: {stripeStatus.payouts_enabled ? "✅ Enabled" : "⏳ Pending"}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleConnectStripe} disabled={connectingStripe} className="gap-2">
                        {connectingStripe ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                        Manage
                      </Button>
                    </div>
                  </div>
                </div>
              ) : stripeStatus?.connected && !stripeStatus.details_submitted ? (
                <div className="p-4 rounded-lg border-2 border-yellow-500/30 bg-yellow-500/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Onboarding Incomplete</p>
                        <p className="text-xs text-muted-foreground">Complete your Stripe account setup to start receiving payments</p>
                      </div>
                    </div>
                    <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2" onClick={handleConnectStripe} disabled={connectingStripe}>
                      {connectingStripe ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                      Continue Setup
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg border-2 border-dashed border-accent/30 bg-accent/5 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Connect Stripe</p>
                        <p className="text-xs text-muted-foreground">Set up your bank account to receive payments via Stripe</p>
                      </div>
                    </div>
                    <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2" onClick={handleConnectStripe} disabled={connectingStripe}>
                      {connectingStripe ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Connect Stripe Account
                    </Button>
                  </div>
                </div>
              )}


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
                    {isPopular && <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">Most Popular</Badge>}
                    {isCurrent && <Badge className="absolute -top-2.5 right-4 bg-accent text-accent-foreground">Your Plan</Badge>}
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="h-5 w-5 text-accent" />
                      <h4 className="font-display font-bold text-lg text-foreground">{plan.name}</h4>
                    </div>
                    <p className="text-3xl font-display font-bold text-foreground">
                      {formatMoney(plan.price[currency] || plan.price["GBP"], currency)}
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </p>
                    <ul className="mt-4 space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-3.5 w-3.5 text-accent shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full mt-6" variant={isCurrent ? "outline" : "default"} disabled={isCurrent || checkingOut === plan.tier} onClick={() => handleSubscribe(plan.tier)}>
                      {checkingOut === plan.tier ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing…</> : isCurrent ? "Current Plan" : "Upgrade"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Invite User Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email Address</Label>
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@example.com" className="mt-1" />
            </div>
            <div>
              <Label>Role</Label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <Button onClick={handleInviteUser} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={inviting}>
              {inviting ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
