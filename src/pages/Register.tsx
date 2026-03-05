import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft } from "lucide-react";

type Step = "personal" | "company";

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("personal");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    companyName: "",
    companyNumber: "",
    companyPhone: "",
    companyEmail: "",
    address: "",
    country: "UK",
    currency: "GBP" as "GBP" | "NGN",
    businessType: "wholesale" as "wholesale" | "retail" | "hybrid",
    brandColor: "#0d9488",
  });

  const handleNext = () => {
    if (!form.fullName.trim() || !form.email.trim() || form.password.length < 6) {
      toast.error("Please fill all personal fields. Password must be at least 6 characters.");
      return;
    }
    setStep("company");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    setLoading(true);
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.fullName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (authErr) throw authErr;

      const userId = authData.user?.id;
      if (!userId) throw new Error("Registration failed");

      // Create company
      const { data: company, error: compErr } = await supabase
        .from("companies")
        .insert({
          name: form.companyName,
          company_number: form.companyNumber || null,
          phone: form.companyPhone || null,
          email: form.companyEmail || null,
          address: form.address || null,
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
        .eq("user_id", userId);

      // Add owner role
      await supabase
        .from("user_roles")
        .insert({ user_id: userId, company_id: company.id, role: "owner" });

      // Create subscription
      await supabase
        .from("subscriptions")
        .insert({ company_id: company.id, plan: "starter", max_products: 500, max_users: 1 });

      toast.success("Account created! Welcome to Zentra 🎉");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-xl zentra-gradient flex items-center justify-center mx-auto mb-4">
            <span className="text-accent-foreground font-display font-bold text-lg">Z</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {step === "personal" ? "Create your Zentra account" : "Set up your company"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === "personal" ? "Start with your personal details" : "Tell us about your business"}
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <div className={`h-1.5 w-12 rounded-full ${step === "personal" ? "bg-accent" : "bg-muted"}`} />
            <div className={`h-1.5 w-12 rounded-full ${step === "company" ? "bg-accent" : "bg-muted"}`} />
          </div>
        </div>

        <div className="zentra-card p-6">
          <form onSubmit={step === "personal" ? (e) => { e.preventDefault(); handleNext(); } : handleRegister} className="space-y-4">
            {step === "personal" ? (
              <>
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Chioma Okafor" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@business.com" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" className="mt-1" />
                </div>
                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label>Company Name *</Label>
                    <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Mama Africa Wholesale" className="mt-1" />
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
                      onChange={(e) => setForm({ ...form, country: e.target.value, currency: e.target.value === "Nigeria" ? "NGN" : "GBP" })}
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="UK">United Kingdom</option>
                      <option value="Nigeria">Nigeria</option>
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
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="gap-2" onClick={() => setStep("personal")}>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button type="submit" className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 gap-2" disabled={loading}>
                    {loading ? "Creating..." : "Create Account & Workspace"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account? <Link to="/login" className="text-accent hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
