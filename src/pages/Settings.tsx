import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/currency";
import { PLANS, STRIPE_PRICES } from "@/lib/demo-data";
import { validateEmail, validateAddress } from "@/lib/validation";
import { FieldError } from "@/components/FieldError";
import { PayoutOnboarding } from "@/components/PayoutOnboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Building2, Users, CreditCard, Globe, Check, Loader2, Banknote, ExternalLink, Star, Crown, Zap, UserPlus, ShieldCheck, Warehouse, AlertTriangle, Copy, CheckCircle2, Download, Trash2, Database,
} from "lucide-react";
import { WarehouseManager } from "@/components/WarehouseManager";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";
import { StatusBadge } from "@/components/StatusBadge";
import { usePlanFeatures, type Feature } from "@/hooks/use-plan-features";
import { UpgradeModal } from "@/components/UpgradeModal";
import { toast } from "sonner";
import type { Currency } from "@/lib/types";

export default function Settings() {
  const { company, profile, user, refreshProfile, role } = useAuth();
  const { currentPlan, isPro, limits, canAddUser, requiredPlanFor } = usePlanFeatures();
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; feature: Feature; label: string }>({
    open: false, feature: "multi_location", label: "",
  });
  const isOwner = role === "owner";
  const isManager = role === "manager";
  const currency = (company?.currency || "GBP") as Currency;
  const [saving, setSaving] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [managingPortal, setManagingPortal] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [inviting, setInviting] = useState(false);
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean; charges_enabled?: boolean; payouts_enabled?: boolean; details_submitted?: boolean;
  } | null>(null);
  const [loadingStripeStatus, setLoadingStripeStatus] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: "", address: "", country: "", currency: "GBP", brand_color: "#0d9488",
    business_type: "wholesale", company_number: "", phone: "", email: "",
    custom_domain: "", subdomain: "",
  });
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [domainStep, setDomainStep] = useState<"input" | "dns" | "verifying">("input");
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);

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
            subdomain: (data as any).subdomain || "",
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

  useEffect(() => {
    if (!company) return;
    setLoadingStripeStatus(true);
    supabase.functions.invoke("stripe-connect-status").then(({ data, error }) => {
      if (error) { setStripeStatus(null); } else if (data) { setStripeStatus(data); }
      setLoadingStripeStatus(false);
    });
  }, [company]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_connected") === "true") {
      toast.success("Bank account connected successfully!", { description: "Your payout setup is complete." });
      window.history.replaceState({}, "", window.location.pathname + "?tab=payments");
    }
    if (params.get("stripe_refresh") === "true") {
      toast.info("Please complete your bank account setup");
      window.history.replaceState({}, "", window.location.pathname + "?tab=payments");
    }
  }, []);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  const handleSaveCompany = async () => {
    if (!company) return;
    const emailErr = validateEmail(companyForm.email);
    const addrErr = validateAddress(companyForm.address);
    setFieldErrors({ email: emailErr, address: addrErr });
    if (emailErr || addrErr) { toast.error("Please fix validation errors"); return; }
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
    else {
      toast.success("Company details saved!");
      await refreshProfile();
      document.documentElement.style.setProperty("--brand-color", companyForm.brand_color);
    }
  };

  const handleSaveCustomDomain = async () => {
    if (!company || !isPro) return;
    setSaving(true);
    const { error } = await supabase.from("companies")
      .update({ custom_domain: companyForm.custom_domain || null } as any).eq("id", company.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Custom domain saved!");
      setDomainStep("dns");
    }
  };

  const handleInviteUser = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address"); return;
    }
    if (!company) return;
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("team-invite", { body: { email, role: inviteRole } });
      if (error) throw error;
      toast.success("Invitation email sent", {
        description: data?.mode === "magiclink"
          ? "They'll receive a sign-in link and be added to your team automatically."
          : "They'll receive an invite email to join your workspace.",
        duration: 6000,
      });
      setShowInvite(false); setInviteEmail("");
    } catch (err: any) {
      toast.error(err?.context?.error || err.message || "Failed to send invitation");
    } finally { setInviting(false); }
  };

  const handleSubscribe = async (tier: string) => {
    const prices = STRIPE_PRICES[tier as keyof typeof STRIPE_PRICES];
    const priceId = billingAnnual ? prices?.annual : prices?.monthly;
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRecord(label);
    setTimeout(() => setCopiedRecord(null), 2000);
  };

  const planIcons = { starter: Zap, growth: Star, pro: Crown };
  const subdomain = companyForm.subdomain || companyForm.name?.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Settings" subtitle="Manage your company, billing, and integrations" />

      <Tabs defaultValue={new URLSearchParams(window.location.search).get("tab") || "company"} className="space-y-6">
        <TabsList className="bg-muted/50 flex flex-wrap">
          <TabsTrigger value="company" className="gap-2"><Building2 className="h-4 w-4" /> Company</TabsTrigger>
          {isOwner && <TabsTrigger value="team" className="gap-2"><Users className="h-4 w-4" /> Team</TabsTrigger>}
          {(isOwner || isManager) && <TabsTrigger value="warehouses" className="gap-2"><Warehouse className="h-4 w-4" /> Warehouses</TabsTrigger>}
          <TabsTrigger value="security" className="gap-2"><ShieldCheck className="h-4 w-4" /> Security</TabsTrigger>
          {isOwner && <TabsTrigger value="payments" className="gap-2"><Banknote className="h-4 w-4" /> Payments</TabsTrigger>}
          {isOwner && <TabsTrigger value="domain" className="gap-2"><Globe className="h-4 w-4" /> Domain</TabsTrigger>}
          {isOwner && <TabsTrigger value="billing" className="gap-2"><CreditCard className="h-4 w-4" /> Billing</TabsTrigger>}
          <TabsTrigger value="data-privacy" className="gap-2"><Database className="h-4 w-4" /> Data & Privacy</TabsTrigger>
        </TabsList>

        {/* COMPANY TAB */}
        <TabsContent value="company">
          <div className="stokivo-card p-6 space-y-6">
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
                  <Input type="color" value={companyForm.brand_color} onChange={(e) => setCompanyForm({ ...companyForm, brand_color: e.target.value })} className="w-12 h-10 p-1 cursor-pointer border-2" />
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

        {/* TEAM TAB - Owner only */}
        {isOwner && (
        <TabsContent value="team">
          <div className="stokivo-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-semibold text-foreground">Team Members</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {teamMembers.length} / {limits.maxUsers === Infinity ? "∞" : limits.maxUsers} users
                </span>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2" onClick={() => {
                  if (!canAddUser(teamMembers.length)) {
                    const neededPlan = currentPlan === "starter" ? "multi_location" : "rbac_advanced";
                    setUpgradeModal({ open: true, feature: neededPlan as Feature, label: `More than ${limits.maxUsers} team members` });
                    return;
                  }
                  setShowInvite(true);
                }}>
                  <UserPlus className="h-4 w-4" /> Invite User
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {teamMembers.map((member) => {
                const isSelf = member.user_id === user?.id;
                return (
                  <div key={member.user_id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                    <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center text-xs font-semibold text-accent">
                      {member.name.split(" ").map((n: string) => n[0]).join("")}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{member.name}{isSelf ? " (You)" : ""}</p>
                    </div>
                    {!isSelf ? (
                      <select
                        value={member.role}
                        onChange={async (e) => {
                          const newRole = e.target.value;
                          const { error } = await supabase.from("user_roles").update({ role: newRole as any }).eq("user_id", member.user_id).eq("company_id", company!.id);
                          if (error) { toast.error(error.message); return; }
                          setTeamMembers((prev) => prev.map((m) => m.user_id === member.user_id ? { ...m, role: newRole } : m));
                          toast.success(`Role updated to ${newRole}`);
                        }}
                        className="text-xs font-medium bg-muted px-2 py-1 rounded border border-input"
                      >
                        <option value="owner">Owner</option>
                        <option value="manager">Manager</option>
                        <option value="staff">Staff</option>
                      </select>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground capitalize bg-muted px-2 py-1 rounded">{member.role}</span>
                    )}
                    {!isSelf ? (
                      <Button
                        variant={member.active ? "outline" : "default"}
                        size="sm"
                        className="text-xs h-7"
                        onClick={async () => {
                          const newActive = !member.active;
                          const { error } = await supabase.from("user_roles").update({ active: newActive }).eq("user_id", member.user_id).eq("company_id", company!.id);
                          if (error) { toast.error(error.message); return; }
                          setTeamMembers((prev) => prev.map((m) => m.user_id === member.user_id ? { ...m, active: newActive } : m));
                          toast.success(newActive ? "Member activated" : "Member deactivated");
                        }}
                      >
                        {member.active ? "Deactivate" : "Activate"}
                      </Button>
                    ) : (
                      <StatusBadge status={member.active ? "active" : "inactive"} />
                    )}
                  </div>
                );
              })}
              {teamMembers.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No team members found</p>}
            </div>
          </div>
        </TabsContent>
        )}

        {/* WAREHOUSES TAB */}
        {(isOwner || isManager) && (
        <TabsContent value="warehouses">
          <div className="stokivo-card p-6">
            <WarehouseManager />
          </div>
        </TabsContent>
        )}

        {/* SECURITY TAB */}
        <TabsContent value="security">
          <div className="stokivo-card p-6">
            <TwoFactorSetup />
          </div>
        </TabsContent>

        {/* PAYMENTS TAB - Owner only */}
        {isOwner && (
        <TabsContent value="payments">
          <div className="space-y-6">
            <div className="stokivo-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <Banknote className="h-5 w-5 text-accent" />
                <div>
                  <h3 className="font-display font-semibold text-foreground">Set Up Payouts</h3>
                  <p className="text-sm text-muted-foreground">Connect your bank account to receive customer payments directly</p>
                </div>
              </div>
              <Separator className="mb-6" />
              <PayoutOnboarding
                stripeStatus={stripeStatus}
                loadingStripeStatus={loadingStripeStatus}
                onRefreshStatus={() => {
                  setLoadingStripeStatus(true);
                  supabase.functions.invoke("stripe-connect-status").then(({ data, error }) => {
                    if (!error && data) setStripeStatus(data);
                    setLoadingStripeStatus(false);
                  });
                }}
              />
            </div>
            <div className="stokivo-card p-6">
              <h3 className="font-display font-semibold text-foreground mb-4">Payment Fee Example</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Customer pays</span><span className="font-medium">£100.00</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Stripe processing fee (~1.4%)</span><span className="text-destructive">-£1.40</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Platform fee (0.5%)</span><span className="text-destructive">-£0.50</span></div>
                <Separator />
                <div className="flex justify-between font-bold"><span>You receive</span><span className="text-green-600">£98.10</span></div>
              </div>
            </div>
          </div>
        </TabsContent>
        )}

        {/* DOMAIN TAB - Owner only */}
        {isOwner && (
        <TabsContent value="domain">
          <div className="space-y-6">
            <div className="stokivo-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-accent" />
                <div>
                  <h3 className="font-display font-semibold text-foreground">Your Stokivo Subdomain</h3>
                  <p className="text-sm text-muted-foreground">Available on all plans — automatically generated from your business name</p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{subdomain}.stokivo.com</p>
                  <p className="text-xs text-muted-foreground mt-1">This is your default store URL</p>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copyToClipboard(`${subdomain}.stokivo.com`, "subdomain")}>
                  {copiedRecord === "subdomain" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedRecord === "subdomain" ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="stokivo-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-amber-500" />
                <div>
                  <h3 className="font-display font-semibold text-foreground">Custom Domain</h3>
                  <p className="text-sm text-muted-foreground">Connect your own domain (Pro plan only)</p>
                </div>
                <Badge variant={isPro ? "default" : "secondary"} className="ml-auto">{isPro ? "Available" : "Pro Only"}</Badge>
              </div>

              {!isPro && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Upgrade to Pro to use custom domains</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Custom domains let you use your own domain like freshmart.com</p>
                    <Button size="sm" className="mt-3" onClick={() => handleSubscribe("pro")}>Upgrade to Pro</Button>
                  </div>
                </div>
              )}

              {isPro && (
                <>
                  {domainStep === "input" && (
                    <div className="space-y-3">
                      <div>
                        <Label>Domain Name</Label>
                        <Input
                          value={companyForm.custom_domain}
                          onChange={(e) => setCompanyForm({ ...companyForm, custom_domain: e.target.value })}
                          placeholder="e.g. freshmart.com or shop.freshmart.com"
                          className="mt-1"
                        />
                      </div>
                      <Button onClick={handleSaveCustomDomain} disabled={saving || !companyForm.custom_domain} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Connect Domain
                      </Button>
                    </div>
                  )}

                  {domainStep === "dns" && companyForm.custom_domain && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">Add these DNS records at your domain registrar:</p>
                        <div className="space-y-3">
                          <div className="bg-background rounded p-3 text-xs font-mono space-y-1">
                            <p className="text-muted-foreground">TXT Record (Verification)</p>
                            <div className="flex items-center justify-between">
                              <span>Name: <strong>_stokivo</strong> → Value: <strong>verify={company?.id?.slice(0, 8)}</strong></span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(`verify=${company?.id?.slice(0, 8)}`, "txt")}>
                                {copiedRecord === "txt" ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            </div>
                          </div>
                          <div className="bg-background rounded p-3 text-xs font-mono space-y-1">
                            <p className="text-muted-foreground">CNAME Record</p>
                            <div className="flex items-center justify-between">
                              <span>Name: <strong>@</strong> → Value: <strong>app.stokivo.com</strong></span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard("app.stokivo.com", "cname")}>
                                {copiedRecord === "cname" ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setDomainStep("input")}>Back</Button>
                        <Button onClick={() => { setDomainStep("verifying"); toast.success("Domain verification started — this may take up to 24 hours."); }} className="bg-accent text-accent-foreground hover:bg-accent/90">
                          I've Added the Records
                        </Button>
                      </div>
                    </div>
                  )}

                  {domainStep === "verifying" && (
                    <div className="bg-muted/50 rounded-lg p-6 text-center space-y-2">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" />
                      <p className="text-sm font-medium text-foreground">Verifying {companyForm.custom_domain}…</p>
                      <p className="text-xs text-muted-foreground">DNS propagation can take up to 24 hours</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => setDomainStep("input")}>Change Domain</Button>
                    </div>
                  )}

                  {companyForm.custom_domain && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Priority: Custom domain → Stokivo subdomain ({subdomain}.stokivo.com)
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </TabsContent>
        )}

        {/* BILLING TAB - Owner only */}
        {isOwner && (
        <TabsContent value="billing">
          <div className="space-y-6">
            <div className="stokivo-card p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-accent" />
                  <div>
                    <h3 className="font-display font-semibold text-foreground">Current Plan: <span className="text-accent">{currentPlan.toUpperCase()}</span></h3>
                    <p className="text-sm text-muted-foreground">Your plan renews {billingAnnual ? "annually" : "monthly"}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleManageSubscription} disabled={managingPortal}>
                  {managingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  Manage Subscription
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm font-medium ${!billingAnnual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
              <Switch checked={billingAnnual} onCheckedChange={setBillingAnnual} />
              <span className={`text-sm font-medium ${billingAnnual ? "text-foreground" : "text-muted-foreground"}`}>Annual</span>
              {billingAnnual && <Badge variant="secondary" className="text-green-600 bg-green-50 dark:bg-green-950/30">Save ~20%</Badge>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map((plan) => {
                const isCurrent = plan.tier === currentPlan;
                const Icon = planIcons[plan.tier as keyof typeof planIcons] || Zap;
                const isPopular = plan.tier === "growth";
                const displayPrice = billingAnnual && plan.annualPrice
                  ? plan.annualPrice[currency] || plan.annualPrice["GBP"]
                  : plan.price[currency] || plan.price["GBP"];
                return (
                  <div key={plan.tier} className={`stokivo-card p-6 relative ${isCurrent ? "border-accent border-2" : ""} ${isPopular ? "ring-2 ring-accent/20" : ""}`}>
                    {isPopular && <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">Most Popular</Badge>}
                    {isCurrent && <Badge className="absolute -top-2.5 right-4 bg-accent text-accent-foreground">Your Plan</Badge>}
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="h-5 w-5 text-accent" />
                      <h4 className="font-display font-bold text-lg text-foreground">{plan.name}</h4>
                    </div>
                    <p className="text-3xl font-display font-bold text-foreground">
                      {formatMoney(displayPrice, currency)}
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </p>
                    {billingAnnual && plan.annualPrice && (
                      <p className="text-xs text-muted-foreground mt-1 line-through">
                        {formatMoney(plan.price[currency] || plan.price["GBP"], currency)}/mo
                      </p>
                    )}
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
        )}
        {/* DATA & PRIVACY TAB */}
        <TabsContent value="data-privacy">
          <div className="stokivo-card p-6 space-y-8">
            <div>
              <h3 className="font-display font-bold text-lg text-foreground mb-1">Data & Privacy</h3>
              <p className="text-sm text-muted-foreground">Manage your data in accordance with UK GDPR. Export or delete your data at any time.</p>
            </div>

            <Separator />

            {/* Data Export */}
            <div className="space-y-3">
              <h4 className="font-display font-semibold text-foreground flex items-center gap-2"><Download className="h-4 w-4" /> Export Your Data</h4>
              <p className="text-sm text-muted-foreground">Download a complete copy of all your business data in CSV format. This includes products, sales, customers, invoices, inventory movements, and team information.</p>
              <Button variant="outline" className="gap-2" onClick={async () => {
                if (!company) return;
                toast.info("Preparing your data export...");
                try {
                  const tables = [
                    { name: "products", query: supabase.from("products").select("*").eq("company_id", company.id) },
                    { name: "sales", query: supabase.from("sales").select("*").eq("company_id", company.id) },
                    { name: "sale_items", query: supabase.from("sale_items").select("*, sales!inner(company_id)").eq("sales.company_id", company.id) },
                    { name: "customers", query: supabase.from("customers").select("*").eq("company_id", company.id) },
                    { name: "invoices", query: supabase.from("invoices").select("*").eq("company_id", company.id) },
                    { name: "suppliers", query: supabase.from("suppliers").select("*").eq("company_id", company.id) },
                    { name: "inventory_movements", query: supabase.from("inventory_movements").select("*").eq("company_id", company.id) },
                  ];

                  for (const table of tables) {
                    const { data, error } = await table.query;
                    if (error || !data || data.length === 0) continue;
                    const headers = Object.keys(data[0]);
                    const csv = [headers.join(","), ...data.map(row => headers.map(h => {
                      const val = (row as any)[h];
                      const str = val === null || val === undefined ? "" : String(val);
                      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
                    }).join(","))].join("\n");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = `stokivo-${table.name}-export.csv`; a.click();
                    URL.revokeObjectURL(url);
                  }
                  toast.success("Data exported successfully!");
                } catch (err) {
                  toast.error("Failed to export data. Please try again.");
                }
              }}>
                <Download className="h-4 w-4" /> Export All Data (CSV)
              </Button>
            </div>

            <Separator />

            {/* Account Deletion */}
            {isOwner && (
              <div className="space-y-3">
                <h4 className="font-display font-semibold text-destructive flex items-center gap-2"><Trash2 className="h-4 w-4" /> Delete Account & Data</h4>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your Stokivo account and all associated business data. This action is <strong>irreversible</strong> and will:
                  </p>
                  <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
                    <li>Delete all products, sales, and inventory records</li>
                    <li>Delete all customer and supplier data</li>
                    <li>Cancel your subscription</li>
                    <li>Remove all team members' access</li>
                    <li>Financial records may be retained for up to 7 years as required by HMRC</li>
                  </ul>
                  <p className="text-sm text-muted-foreground">To request account deletion, please contact <strong>privacy@stokivo.com</strong> from your registered email address. We will process your request within 30 days as required by UK GDPR.</p>
                </div>
              </div>
            )}

            <Separator />

            {/* Legal Links */}
            <div className="space-y-2">
              <h4 className="font-display font-semibold text-foreground">Legal</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                <a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a>
                <a href="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</a>
              </div>
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
      <UpgradeModal
        open={upgradeModal.open}
        onOpenChange={(open) => setUpgradeModal((prev) => ({ ...prev, open }))}
        requiredPlan={requiredPlanFor(upgradeModal.feature)}
        featureLabel={upgradeModal.label}
        currentPlan={currentPlan}
      />
    </div>
  );
}