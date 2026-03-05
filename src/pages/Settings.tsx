import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/currency";
import { PLANS } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, CreditCard, Globe, Check, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";

export default function Settings() {
  const { company, profile, user, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: "",
    address: "",
    country: "",
    currency: "GBP",
    brand_color: "#0d9488",
    business_type: "wholesale",
    company_number: "",
    phone: "",
    email: "",
    custom_domain: "",
  });
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  useEffect(() => {
    if (company) {
      // Fetch full company details
      supabase.from("companies").select("*").eq("id", company.id).single().then(({ data }) => {
        if (data) {
          setCompanyForm({
            name: data.name || "",
            address: data.address || "",
            country: data.country || "UK",
            currency: data.currency || "GBP",
            brand_color: data.brand_color || "#0d9488",
            business_type: data.business_type || "wholesale",
            company_number: (data as any).company_number || "",
            phone: (data as any).phone || "",
            email: (data as any).email || "",
            custom_domain: (data as any).custom_domain || "",
          });
        }
      });

      // Fetch team members
      supabase
        .from("user_roles")
        .select("user_id, role, active")
        .eq("company_id", company.id)
        .then(async ({ data: roles }) => {
          if (!roles) return;
          const userIds = roles.map((r) => r.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url")
            .in("user_id", userIds);
          
          setTeamMembers(
            roles.map((r) => {
              const p = profiles?.find((pr) => pr.user_id === r.user_id);
              return { ...r, name: p?.full_name || "Unknown", avatar_url: p?.avatar_url };
            })
          );
        });
    }
  }, [company]);

  const handleSaveCompany = async () => {
    if (!company) return;
    setSaving(true);
    const { error } = await supabase
      .from("companies")
      .update({
        name: companyForm.name,
        address: companyForm.address,
        country: companyForm.country,
        currency: companyForm.currency as any,
        brand_color: companyForm.brand_color,
        business_type: companyForm.business_type as any,
        company_number: companyForm.company_number || null,
        phone: companyForm.phone || null,
        email: companyForm.email || null,
      } as any)
      .eq("id", company.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Company details saved!");
      await refreshProfile();
    }
  };

  const handleSaveDomain = async () => {
    if (!company) return;
    setSaving(true);
    const { error } = await supabase
      .from("companies")
      .update({ custom_domain: companyForm.custom_domain || null } as any)
      .eq("id", company.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Custom domain saved!");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Settings" subtitle="Manage your company and account" />

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="company" className="gap-2"><Building2 className="h-4 w-4" /> Company</TabsTrigger>
          <TabsTrigger value="team" className="gap-2"><Users className="h-4 w-4" /> Team</TabsTrigger>
          <TabsTrigger value="domain" className="gap-2"><Globe className="h-4 w-4" /> Domain</TabsTrigger>
          <TabsTrigger value="billing" className="gap-2"><CreditCard className="h-4 w-4" /> Billing</TabsTrigger>
        </TabsList>

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
              <div>
                <Label>Company Name</Label>
                <Input value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Company Number</Label>
                <Input value={companyForm.company_number} onChange={(e) => setCompanyForm({ ...companyForm, company_number: e.target.value })} placeholder="e.g. 12345678" className="mt-1" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <Label>Address</Label>
                <Input value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Country</Label>
                <select
                  value={companyForm.country}
                  onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value, currency: e.target.value === "Nigeria" ? "NGN" : "GBP" })}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="UK">United Kingdom</option>
                  <option value="Nigeria">Nigeria</option>
                </select>
              </div>
              <div>
                <Label>Business Type</Label>
                <select
                  value={companyForm.business_type}
                  onChange={(e) => setCompanyForm({ ...companyForm, business_type: e.target.value })}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="wholesale">Wholesale</option>
                  <option value="retail">Retail</option>
                  <option value="hybrid">Hybrid</option>
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
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="team">
          <div className="zentra-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-semibold text-foreground">Team Members</h3>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                <Users className="h-4 w-4" /> Invite User
              </Button>
            </div>
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.user_id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                  <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center text-xs font-semibold text-accent">
                    {member.name.split(" ").map((n: string) => n[0]).join("")}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground capitalize bg-muted px-2 py-1 rounded">
                    {member.role}
                  </span>
                  <StatusBadge status={member.active ? "active" : "inactive"} />
                </div>
              ))}
              {teamMembers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No team members found</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="domain">
          <div className="zentra-card p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="h-5 w-5 text-accent" />
              <div>
                <h3 className="font-display font-semibold text-foreground">Custom Domain</h3>
                <p className="text-sm text-muted-foreground">Connect your own domain to your Zentra workspace</p>
              </div>
            </div>

            <div>
              <Label>Custom Domain</Label>
              <Input
                value={companyForm.custom_domain}
                onChange={(e) => setCompanyForm({ ...companyForm, custom_domain: e.target.value })}
                placeholder="invoices.yourbusiness.com"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Point your domain's A record to <code className="bg-muted px-1 py-0.5 rounded text-xs">185.158.133.1</code> and
                add a TXT record <code className="bg-muted px-1 py-0.5 rounded text-xs">_lovable</code> for verification.
              </p>
            </div>

            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">DNS Setup Instructions</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <span className="font-mono text-xs bg-muted px-2 py-1 rounded shrink-0">A</span>
                  <span>Point <code>@</code> (root) and <code>www</code> to <code>185.158.133.1</code></span>
                </div>
                <div className="flex gap-3">
                  <span className="font-mono text-xs bg-muted px-2 py-1 rounded shrink-0">TXT</span>
                  <span>Add <code>_lovable</code> TXT record for domain verification</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">DNS changes can take up to 72 hours to propagate. SSL will be provisioned automatically.</p>
            </div>

            <Button onClick={handleSaveDomain} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Domain
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="billing">
          <div className="space-y-6">
            <div className="zentra-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="h-5 w-5 text-accent" />
                <div>
                  <h3 className="font-display font-semibold text-foreground">Current Plan: {(company?.plan || "starter").toUpperCase()}</h3>
                  <p className="text-sm text-muted-foreground">Your plan renews monthly</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map((plan) => (
                <div
                  key={plan.tier}
                  className={`zentra-card p-6 ${plan.tier === (company?.plan || "starter") ? "border-accent border-2" : ""}`}
                >
                  <h4 className="font-display font-bold text-lg text-foreground">{plan.name}</h4>
                  <p className="text-2xl font-display font-bold text-foreground mt-2">
                    {formatMoney(plan.price[(company?.currency || "GBP") as "GBP" | "NGN"], (company?.currency || "GBP") as "GBP" | "NGN")}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full mt-6"
                    variant={plan.tier === (company?.plan || "starter") ? "outline" : "default"}
                    disabled={plan.tier === (company?.plan || "starter")}
                  >
                    {plan.tier === (company?.plan || "starter") ? "Current Plan" : "Upgrade"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
