import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { validateEmail, validateAddress } from "@/lib/validation";
import { FieldError } from "@/components/FieldError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, ArrowRight } from "lucide-react";

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    companyNumber: "",
    companyPhone: "",
    companyEmail: "",
    address: "",
    country: "UK",
    currency: "GBP",
    brandColor: "#0d9488",
    businessType: "wholesale" as "wholesale" | "retail" | "hybrid",
  });

  // Wait for auth to load
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl zentra-gradient flex items-center justify-center animate-pulse-subtle">
            <span className="text-accent-foreground font-display font-bold">Z</span>
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in → go to login
  if (!user) return <Navigate to="/login" replace />;

  // Already has company → go to dashboard
  if (profile?.company_id) return <Navigate to="/dashboard" replace />;

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Company name is required");
      return;
    }
    const emailErr = validateEmail(form.companyEmail);
    const addrErr = validateAddress(form.address);
    setFieldErrors({ email: emailErr, address: addrErr });
    if (emailErr || addrErr) { toast.error("Please fix validation errors"); return; }
    if (!user) {
      toast.error("Not authenticated");
      return;
    }
    setLoading(true);
    try {
      const companyId = crypto.randomUUID();

      const { error: compErr } = await supabase
        .from("companies")
        .insert({
          id: companyId,
          name: form.name,
          company_number: form.companyNumber || null,
          phone: form.companyPhone || null,
          email: form.companyEmail || null,
          address: form.address,
          country: form.country,
          currency: form.currency as any,
          brand_color: form.brandColor,
          business_type: form.businessType,
        });

      if (compErr) throw compErr;

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ company_id: companyId })
        .eq("user_id", user.id);

      if (profileErr) throw profileErr;

      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, company_id: companyId, role: "owner" });

      if (roleErr) throw roleErr;

      const { error: subErr } = await supabase
        .from("subscriptions")
        .insert({ company_id: companyId, plan: "starter", max_products: 500, max_users: 1 });

      if (subErr) throw subErr;

      await refreshProfile();
      toast.success("Company created! Welcome to Zentra 🎉");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to create company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-xl zentra-gradient flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-7 w-7 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Set up your workspace</h1>
          <p className="text-sm text-muted-foreground mt-1">Tell us about your business to get started</p>
        </div>

        <div className="zentra-card p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Company Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mama Africa Wholesale" className="mt-1" />
            </div>
            <div>
              <Label>Company Number</Label>
              <Input value={form.companyNumber} onChange={(e) => setForm({ ...form, companyNumber: e.target.value })} placeholder="e.g. 12345678" className="mt-1" />
            </div>
            <div>
              <Label>Company Phone</Label>
              <Input value={form.companyPhone} onChange={(e) => setForm({ ...form, companyPhone: e.target.value })} placeholder="+44 7700 900000" className="mt-1" />
            </div>
            <div>
              <Label>Company Email</Label>
              <Input type="email" value={form.companyEmail} onChange={(e) => setForm({ ...form, companyEmail: e.target.value })} placeholder="info@business.com" className="mt-1" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="45 Peckham High St, London" className="mt-1" />
            </div>
            <div>
              <Label>Country</Label>
              <select
                value={form.country}
                onChange={(e) => {
                  const c = e.target.value;
                  const currMap: Record<string, string> = {
                    "UK": "GBP", "Nigeria": "NGN", "USA": "USD", "Canada": "CAD",
                    "Ghana": "GHS", "Kenya": "KES", "South Africa": "ZAR",
                    "India": "INR", "UAE": "AED", "Australia": "AUD", "EU": "EUR",
                  };
                  setForm({ ...form, country: c, currency: currMap[c] || "USD" });
                }}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="UK">United Kingdom</option>
                <option value="Nigeria">Nigeria</option>
                <option value="USA">United States</option>
                <option value="Canada">Canada</option>
                <option value="Ghana">Ghana</option>
                <option value="Kenya">Kenya</option>
                <option value="South Africa">South Africa</option>
                <option value="India">India</option>
                <option value="UAE">UAE</option>
                <option value="Australia">Australia</option>
                <option value="EU">European Union</option>
              </select>
            </div>
            <div>
              <Label>Currency</Label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="GBP">GBP (£)</option>
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="GHS">GHS (₵)</option>
                <option value="KES">KES (KSh)</option>
                <option value="ZAR">ZAR (R)</option>
                <option value="INR">INR (₹)</option>
                <option value="AED">AED (د.إ)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>
            <div>
              <Label>Business Type</Label>
              <select
                value={form.businessType}
                onChange={(e) => setForm({ ...form, businessType: e.target.value as any })}
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
                <Input
                  type="color"
                  value={form.brandColor}
                  onChange={(e) => setForm({ ...form, brandColor: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input value={form.brandColor} onChange={(e) => setForm({ ...form, brandColor: e.target.value })} className="flex-1" />
              </div>
            </div>
          </div>

          <Button onClick={handleCreate} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 gap-2" disabled={loading}>
            {loading ? "Creating..." : "Create Workspace"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
