import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, ArrowRight } from "lucide-react";

type Step = "company" | "details";

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>("company");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    country: "UK",
    currency: "GBP" as "GBP" | "NGN",
    brandColor: "#0d9488",
    businessType: "wholesale" as "wholesale" | "retail" | "hybrid",
  });

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (!user) {
      toast.error("Not authenticated");
      return;
    }
    setLoading(true);
    try {
      // Create company
      const { data: company, error: compErr } = await supabase
        .from("companies")
        .insert({
          name: form.name,
          address: form.address,
          country: form.country,
          currency: form.currency,
          brand_color: form.brandColor,
          business_type: form.businessType,
        })
        .select("id")
        .single();

      if (compErr) throw compErr;

      // Update profile with company_id
      await supabase
        .from("profiles")
        .update({ company_id: company.id })
        .eq("user_id", user.id);

      // Add owner role
      await supabase
        .from("user_roles")
        .insert({ user_id: user.id, company_id: company.id, role: "owner" });

      // Create subscription
      await supabase
        .from("subscriptions")
        .insert({ company_id: company.id, plan: "starter", max_products: 500, max_users: 1 });

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
          <p className="text-sm text-muted-foreground mt-1">Tell us about your business</p>
        </div>

        <div className="zentra-card p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Company Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mama Africa Wholesale" className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="45 Peckham High St, London" className="mt-1" />
            </div>
            <div>
              <Label>Country</Label>
              <select
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value, currency: e.target.value === "Nigeria" ? "NGN" : "GBP" })}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="UK">United Kingdom</option>
                <option value="Nigeria">Nigeria</option>
              </select>
            </div>
            <div>
              <Label>Currency</Label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value as "GBP" | "NGN" })}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="GBP">GBP (£)</option>
                <option value="NGN">NGN (₦)</option>
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
