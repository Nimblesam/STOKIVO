import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { validateEmail, validateAddress } from "@/lib/validation";
import { FieldError } from "@/components/FieldError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import stokivoLogo from "@/assets/stokivo-logo.png";
import {
  Building2, MapPin, CreditCard, Monitor, Users, Rocket,
  ArrowRight, ArrowLeft, Plus, Trash2, CheckCircle2, Loader2,
  ShieldCheck, UserPlus,
} from "lucide-react";

const STEPS = [
  { label: "Business", icon: Building2 },
  { label: "Locations", icon: MapPin },
  { label: "Payments", icon: CreditCard },
  { label: "POS", icon: Monitor },
  { label: "Team", icon: Users },
  { label: "Activate", icon: Rocket },
];

type Location = { name: string; address: string; city: string; postcode: string };
type TeamMember = { email: string; role: "owner" | "manager" | "staff" };

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  // Step 1 — Business
  const [biz, setBiz] = useState({
    name: "", email: "", phone: "", address: "", country: "UK", currency: "GBP",
    businessType: "retail" as "wholesale" | "retail" | "hybrid",
    isRegistered: false, companyNumber: "", brandColor: "#0d9488",
  });

  // Step 2 — Locations
  const [locations, setLocations] = useState<Location[]>([
    { name: "", address: "", city: "", postcode: "" },
  ]);

  // Step 3 — Payments
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);

  // Step 4 — POS
  const [enableTerminal, setEnableTerminal] = useState(false);

  // Step 5 — Team
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Auth guard
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl stokivo-gradient flex items-center justify-center animate-pulse-subtle">
            <span className="text-accent-foreground font-display font-bold">S</span>
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.company_id) return <Navigate to="/dashboard" replace />;

  const progress = ((step + 1) / STEPS.length) * 100;

  const currMap: Record<string, string> = {
    UK: "GBP", Nigeria: "NGN", USA: "USD", Canada: "CAD",
    Ghana: "GHS", Kenya: "KES", "South Africa": "ZAR",
    India: "INR", UAE: "AED", Australia: "AUD", EU: "EUR",
  };

  const canNext = (): boolean => {
    if (step === 0) return !!biz.name.trim();
    if (step === 1) return locations.some((l) => l.name.trim());
    return true;
  };

  const handleStripeConnect = async () => {
    setStripeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {
        body: { return_url: window.location.href },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Failed to start payment setup");
    } finally {
      setStripeLoading(false);
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const companyId = crypto.randomUUID();

      // Create company
      const { error: compErr } = await supabase.from("companies").insert({
        id: companyId,
        name: biz.name,
        company_number: biz.isRegistered && biz.companyNumber ? biz.companyNumber : null,
        phone: biz.phone || null,
        email: biz.email || null,
        address: biz.address || null,
        country: biz.country,
        currency: biz.currency as any,
        brand_color: biz.brandColor,
        business_type: biz.businessType,
      });
      if (compErr) throw compErr;

      // Create owner role BEFORE updating profile (RLS requires company_id IS NULL on profile)
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, company_id: companyId, role: "owner" });
      if (roleErr) throw roleErr;

      // Update profile with company_id
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ company_id: companyId })
        .eq("user_id", user.id);
      if (profileErr) throw profileErr;

      // Create subscription
      const { error: subErr } = await supabase
        .from("subscriptions")
        .insert({ company_id: companyId, plan: "starter", max_products: 500, max_users: 1 });
      if (subErr) throw subErr;

      // Create locations as stores + warehouses
      const validLocations = locations.filter((l) => l.name.trim());
      if (validLocations.length > 0) {
        // Create stores
        const { data: createdStores, error: storeErr } = await supabase.from("stores").insert(
          validLocations.map((l, i) => ({
            company_id: companyId,
            name: l.name,
            address: [l.address, l.city, l.postcode].filter(Boolean).join(", ") || null,
            is_default: i === 0,
          }))
        ).select("id");
        if (storeErr) throw storeErr;

        // Assign user to all stores with switch permission
        if (createdStores && createdStores.length > 0) {
          await supabase.from("user_store_assignments").insert(
            createdStores.map((s) => ({
              user_id: user.id,
              store_id: s.id,
              company_id: companyId,
              can_switch_store: true,
            }))
          );
        }

        // Create warehouses linked to stores
        const { error: whErr } = await supabase.from("warehouses").insert(
          validLocations.map((l, i) => ({
            company_id: companyId,
            name: l.name,
            address: [l.address, l.city, l.postcode].filter(Boolean).join(", ") || null,
            is_default: i === 0,
            store_id: createdStores?.[i]?.id || null,
          }))
        );
        if (whErr) throw whErr;
      } else {
        // Create a default store if no locations provided
        const { data: defaultStore } = await supabase.from("stores").insert({
          company_id: companyId,
          name: biz.name + " - Main Store",
          is_default: true,
        }).select("id").single();
        if (defaultStore) {
          await supabase.from("user_store_assignments").insert({
            user_id: user.id,
            store_id: defaultStore.id,
            company_id: companyId,
            can_switch_store: true,
          });
        }
      }

      // Invite team members
      for (const member of teamMembers) {
        if (member.email.trim()) {
          try {
            await supabase.functions.invoke("team-invite", {
              body: { email: member.email, role: member.role, company_id: companyId },
            });
          } catch {
            // Silently continue — invites are best-effort during onboarding
          }
        }
      }

      await refreshProfile();
      toast.success("Welcome to Stokivo! Your business is ready 🎉");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to set up your business");
    } finally {
      setLoading(false);
    }
  };

  const addLocation = () => setLocations([...locations, { name: "", address: "", city: "", postcode: "" }]);
  const removeLocation = (i: number) => setLocations(locations.filter((_, idx) => idx !== i));
  const updateLocation = (i: number, field: keyof Location, value: string) => {
    const updated = [...locations];
    updated[i] = { ...updated[i], [field]: value };
    setLocations(updated);
  };

  const addTeamMember = () => setTeamMembers([...teamMembers, { email: "", role: "staff" }]);
  const removeTeamMember = (i: number) => setTeamMembers(teamMembers.filter((_, idx) => idx !== i));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src={stokivoLogo} alt="Stokivo" className="h-8 w-8" />
          <span className="font-display font-bold text-lg text-foreground">Stokivo</span>
          <span className="text-xs text-muted-foreground ml-auto">Step {step + 1} of {STEPS.length}</span>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      {/* Step indicators */}
      <div className="max-w-3xl mx-auto px-4 py-4 w-full">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step ? "bg-accent text-accent-foreground" :
                i === step ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </div>
              <span className={`text-[10px] font-medium ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-lg animate-fade-in">

          {/* STEP 1: Business Setup */}
          {step === 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-display font-bold text-foreground">Tell us about your business</h1>
                <p className="text-sm text-muted-foreground mt-1">This helps us set up your workspace perfectly.</p>
              </div>
              <div className="rounded-2xl border bg-card p-6 space-y-4">
                <div>
                  <Label>Business Name *</Label>
                  <Input value={biz.name} onChange={(e) => setBiz({ ...biz, name: e.target.value })} placeholder="e.g. Mama Africa Wholesale" className="mt-1" />
                </div>
                <div>
                  <Label>Business Type</Label>
                  <select value={biz.businessType} onChange={(e) => setBiz({ ...biz, businessType: e.target.value as any })}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="hybrid">Hybrid (Retail + Wholesale)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Business Email</Label>
                    <Input type="email" value={biz.email} onChange={(e) => setBiz({ ...biz, email: e.target.value })} placeholder="info@business.com" className="mt-1" />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={biz.phone} onChange={(e) => setBiz({ ...biz, phone: e.target.value })} placeholder="+44 7700 900000" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Business Address</Label>
                  <Input value={biz.address} onChange={(e) => setBiz({ ...biz, address: e.target.value })} placeholder="45 Peckham High St, London" className="mt-1" maxLength={500} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Country</Label>
                    <select value={biz.country} onChange={(e) => {
                      const c = e.target.value;
                      setBiz({ ...biz, country: c, currency: currMap[c] || "USD" });
                    }} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {Object.keys(currMap).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <select value={biz.currency} onChange={(e) => setBiz({ ...biz, currency: e.target.value })}
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {["GBP", "NGN", "USD", "EUR", "CAD", "GHS", "KES", "ZAR", "INR", "AED", "AUD"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Registered business toggle */}
                <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">I am a registered business</p>
                    <p className="text-xs text-muted-foreground">e.g. Companies House registered</p>
                  </div>
                  <Switch checked={biz.isRegistered} onCheckedChange={(v) => setBiz({ ...biz, isRegistered: v })} />
                </div>
                {biz.isRegistered && (
                  <div>
                    <Label>Company Registration Number</Label>
                    <Input value={biz.companyNumber} onChange={(e) => setBiz({ ...biz, companyNumber: e.target.value })} placeholder="e.g. 12345678" className="mt-1" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Locations */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-display font-bold text-foreground">Set up your locations</h1>
                <p className="text-sm text-muted-foreground mt-1">Add one or more store or warehouse locations.</p>
              </div>
              <div className="space-y-4">
                {locations.map((loc, i) => (
                  <div key={i} className="rounded-2xl border bg-card p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Location {i + 1}</span>
                      {locations.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeLocation(i)} className="text-destructive h-7 px-2">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div>
                      <Label>Store / Warehouse Name *</Label>
                      <Input value={loc.name} onChange={(e) => updateLocation(i, "name", e.target.value)} placeholder="e.g. Main Store" className="mt-1" />
                    </div>
                    <div>
                      <Label>Address</Label>
                      <Input value={loc.address} onChange={(e) => updateLocation(i, "address", e.target.value)} placeholder="Street address" className="mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>City</Label>
                        <Input value={loc.city} onChange={(e) => updateLocation(i, "city", e.target.value)} placeholder="London" className="mt-1" />
                      </div>
                      <div>
                        <Label>Postcode</Label>
                        <Input value={loc.postcode} onChange={(e) => updateLocation(i, "postcode", e.target.value)} placeholder="SE15 5BA" className="mt-1" />
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addLocation} className="w-full gap-2 rounded-xl">
                  <Plus className="h-4 w-4" /> Add Another Location
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Payments */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-display font-bold text-foreground">Enable Payments</h1>
                <p className="text-sm text-muted-foreground mt-1">Connect a payment account to accept card payments and receive payouts.</p>
              </div>
              <div className="rounded-2xl border bg-card p-6 space-y-5">
                <div className="text-center">
                  <div className="h-16 w-16 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="h-8 w-8 text-primary" />
                  </div>
                  {stripeConnected ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-accent">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-semibold">Payment Account Connected</span>
                      </div>
                      <p className="text-xs text-muted-foreground">You're ready to accept card payments and receive payouts to your bank account.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Secure Payment Setup</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          You'll be redirected to our payment partner to securely verify your identity and connect your bank account. Stokivo never stores your bank details.
                        </p>
                      </div>
                      <div className="text-left space-y-2">
                        {["Identity verification (KYC)", "Bank account connection", "Business verification"].map((item) => (
                          <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                            {item}
                          </div>
                        ))}
                      </div>
                      <Button onClick={handleStripeConnect} disabled={stripeLoading} className="w-full gap-2">
                        {stripeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                        Connect Payment Account
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  You can skip this step and set up payments later in Settings.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: POS / Terminal */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-display font-bold text-foreground">Point of Sale Setup</h1>
                <p className="text-sm text-muted-foreground mt-1">Enable in-store card payments with a card reader.</p>
              </div>
              <div className="rounded-2xl border bg-card p-6 space-y-5">
                <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Enable Card Terminal</p>
                    <p className="text-xs text-muted-foreground">Accept in-store card payments via a card reader</p>
                  </div>
                  <Switch checked={enableTerminal} onCheckedChange={setEnableTerminal} />
                </div>
                {enableTerminal && (
                  <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">Card Reader Setup</p>
                    <p className="text-xs text-muted-foreground">
                      After completing onboarding, go to Settings → POS to pair your card reader via WiFi and assign it to a location.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                      Compatible with Stripe Terminal readers
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground text-center">
                  You can configure POS devices later in Settings.
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: Team */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-display font-bold text-foreground">Invite Your Team</h1>
                <p className="text-sm text-muted-foreground mt-1">Add team members and assign roles. You can do this later too.</p>
              </div>
              <div className="rounded-2xl border bg-card p-6 space-y-4">
                <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-4">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserPlus className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Admin</strong> — Full access |{" "}
                      <strong className="text-foreground">Manager</strong> — Inventory, reports, POS |{" "}
                      <strong className="text-foreground">Staff</strong> — POS and stock updates
                    </p>
                  </div>
                </div>
                {teamMembers.map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Input
                      type="email"
                      value={m.email}
                      onChange={(e) => {
                        const updated = [...teamMembers];
                        updated[i] = { ...updated[i], email: e.target.value };
                        setTeamMembers(updated);
                      }}
                      placeholder="team@example.com"
                      className="flex-1"
                    />
                    <select
                      value={m.role}
                      onChange={(e) => {
                        const updated = [...teamMembers];
                        updated[i] = { ...updated[i], role: e.target.value as any };
                        setTeamMembers(updated);
                      }}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                    </select>
                    <Button variant="ghost" size="sm" onClick={() => removeTeamMember(i)} className="text-destructive h-8 px-2">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" onClick={addTeamMember} className="w-full gap-2 rounded-xl">
                  <Plus className="h-4 w-4" /> Add Team Member
                </Button>
                {teamMembers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center">No team members added yet. You can skip this step.</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: Activation */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Rocket className="h-8 w-8 text-accent" />
                </div>
                <h1 className="text-2xl font-display font-bold text-foreground">You're All Set!</h1>
                <p className="text-sm text-muted-foreground mt-1">Here's a summary of your setup.</p>
              </div>
              <div className="rounded-2xl border bg-card p-6 space-y-4">
                {[
                  { label: "Business Setup", done: !!biz.name.trim(), detail: biz.name || "—" },
                  { label: "Locations Created", done: locations.some((l) => l.name.trim()), detail: `${locations.filter((l) => l.name.trim()).length} location(s)` },
                  { label: "Payments Enabled", done: stripeConnected, detail: stripeConnected ? "Connected" : "Skipped — set up later" },
                  { label: "POS Ready", done: enableTerminal, detail: enableTerminal ? "Enabled" : "Not enabled" },
                  { label: "Team Invites", done: teamMembers.length > 0, detail: teamMembers.length > 0 ? `${teamMembers.length} member(s)` : "No invites — add later" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                    <CheckCircle2 className={`h-5 w-5 shrink-0 ${item.done ? "text-accent" : "text-muted-foreground/40"}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-2 rounded-xl">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            ) : <div />}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={loading} className="gap-2 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 px-8">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                Go to Dashboard
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
