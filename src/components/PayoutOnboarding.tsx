import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Banknote, Building2, User, Globe, ArrowRight, ArrowLeft,
  Check, Loader2, ExternalLink, ShieldCheck, CreditCard, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface PayoutOnboardingProps {
  stripeStatus: {
    connected: boolean;
    charges_enabled?: boolean;
    payouts_enabled?: boolean;
    details_submitted?: boolean;
  } | null;
  loadingStripeStatus: boolean;
  onRefreshStatus: () => void;
}

const COUNTRIES = [
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
];

const BANK_FIELDS: Record<string, { label: string; fields: string[] }> = {
  GB: { label: "UK Bank Account", fields: ["Account Name", "Sort Code", "Account Number"] },
  US: { label: "US Bank Account", fields: ["Account Holder Name", "Routing Number", "Account Number"] },
  NG: { label: "Nigerian Bank Account", fields: ["Account Name", "Bank Name", "Account Number"] },
  CA: { label: "Canadian Bank Account", fields: ["Account Name", "Transit Number", "Institution Number", "Account Number"] },
  default: { label: "Bank Account", fields: ["Account Holder Name", "Bank Details"] },
};

export function PayoutOnboarding({ stripeStatus, loadingStripeStatus, onRefreshStatus }: PayoutOnboardingProps) {
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<"individual" | "company" | null>(null);
  const [country, setCountry] = useState("GB");
  const [connecting, setConnecting] = useState(false);

  // Connected state
  if (stripeStatus?.connected && stripeStatus.details_submitted) {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-2xl border-2 border-green-500/30 bg-gradient-to-br from-green-500/5 to-green-500/10">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <Check className="h-7 w-7 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-lg text-foreground">Payouts Active</h3>
              <p className="text-sm text-muted-foreground">Your account is connected and ready to receive payments</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleConnectStripe()} disabled={connecting} className="gap-2">
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Manage
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-5">
            <div className="p-3 rounded-xl bg-background border">
              <p className="text-xs text-muted-foreground">Charges</p>
              <p className="font-semibold text-sm mt-1 flex items-center gap-1.5">
                {stripeStatus.charges_enabled ? <><Check className="h-3.5 w-3.5 text-green-600" /> Enabled</> : <><AlertCircle className="h-3.5 w-3.5 text-yellow-600" /> Pending</>}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-background border">
              <p className="text-xs text-muted-foreground">Payouts</p>
              <p className="font-semibold text-sm mt-1 flex items-center gap-1.5">
                {stripeStatus.payouts_enabled ? <><Check className="h-3.5 w-3.5 text-green-600" /> Enabled</> : <><AlertCircle className="h-3.5 w-3.5 text-yellow-600" /> Pending</>}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pending verification
  if (stripeStatus?.connected && !stripeStatus.details_submitted) {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-2xl border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-yellow-500/10">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
              <Loader2 className="h-7 w-7 text-yellow-600 animate-spin" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-lg text-foreground">Verification Pending</h3>
              <p className="text-sm text-muted-foreground">Complete your account setup to start receiving payouts</p>
            </div>
          </div>
          <Button className="w-full mt-5 bg-accent text-accent-foreground hover:bg-accent/90 gap-2 h-12"
            onClick={() => handleConnectStripe()} disabled={connecting}>
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Continue Setup
          </Button>
        </div>
      </div>
    );
  }

  const handleConnectStripe = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {
        body: {
          business_type: accountType || "individual",
          country: country,
        },
      });
      if (error) throw new Error(error.message || "Edge function error");
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No redirect URL received from payment provider");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start onboarding");
    } finally {
      setConnecting(false);
    }
  };

  const bankInfo = BANK_FIELDS[country] || BANK_FIELDS.default;

  // Loading
  if (loadingStripeStatus) {
    return (
      <div className="p-8 flex items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Checking payout status...</span>
      </div>
    );
  }

  // Stepper UI
  const steps = [
    { num: 1, label: "Account Type" },
    { num: 2, label: "Country" },
    { num: 3, label: "Bank Preview" },
    { num: 4, label: "Connect" },
  ];

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 ${step >= s.num ? "text-accent" : "text-muted-foreground"}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step > s.num ? "bg-accent text-accent-foreground" : step === s.num ? "bg-accent/10 border-2 border-accent text-accent" : "bg-muted text-muted-foreground"
              }`}>
                {step > s.num ? <Check className="h-4 w-4" /> : s.num}
              </div>
              <span className="text-xs font-medium hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 rounded ${step > s.num ? "bg-accent" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Account Type */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h3 className="font-display font-bold text-lg text-foreground">What type of account are you using?</h3>
            <p className="text-sm text-muted-foreground mt-1">This helps us set up the right payout structure for you</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setAccountType("individual")}
              className={`p-6 rounded-2xl border-2 text-left transition-all hover:shadow-md ${
                accountType === "individual" ? "border-accent bg-accent/5 shadow-sm" : "border-border hover:border-accent/50"
              }`}
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-3 ${
                accountType === "individual" ? "bg-accent/10" : "bg-muted"
              }`}>
                <User className={`h-6 w-6 ${accountType === "individual" ? "text-accent" : "text-muted-foreground"}`} />
              </div>
              <p className="font-semibold text-foreground">Personal</p>
              <p className="text-xs text-muted-foreground mt-1">For sole traders & freelancers</p>
            </button>
            <button
              onClick={() => setAccountType("company")}
              className={`p-6 rounded-2xl border-2 text-left transition-all hover:shadow-md ${
                accountType === "company" ? "border-accent bg-accent/5 shadow-sm" : "border-border hover:border-accent/50"
              }`}
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-3 ${
                accountType === "company" ? "bg-accent/10" : "bg-muted"
              }`}>
                <Building2 className={`h-6 w-6 ${accountType === "company" ? "text-accent" : "text-muted-foreground"}`} />
              </div>
              <p className="font-semibold text-foreground">Business</p>
              <p className="text-xs text-muted-foreground mt-1">For registered companies & LLCs</p>
            </button>
          </div>
          <Button
            className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
            disabled={!accountType}
            onClick={() => setStep(2)}
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step 2: Country */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h3 className="font-display font-bold text-lg text-foreground">Where is your business located?</h3>
            <p className="text-sm text-muted-foreground mt-1">Select the country where your bank account is registered</p>
          </div>
          <div>
            <Label>Country</Label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-1.5 flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button className="flex-1 h-12 bg-accent text-accent-foreground hover:bg-accent/90 gap-2" onClick={() => setStep(3)}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Bank Preview */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h3 className="font-display font-bold text-lg text-foreground">Bank details you'll need</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Have these ready — you'll enter them securely on the next step
            </p>
          </div>
          <div className="p-5 rounded-2xl border bg-muted/30 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Banknote className="h-5 w-5 text-accent" />
              <h4 className="font-semibold text-sm text-foreground">{bankInfo.label}</h4>
              <Badge variant="secondary" className="text-[10px]">
                {COUNTRIES.find(c => c.code === country)?.flag} {country}
              </Badge>
            </div>
            {bankInfo.fields.map((field) => (
              <div key={field} className="flex items-center gap-3 p-3 rounded-xl bg-background border">
                <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <CreditCard className="h-4 w-4 text-accent" />
                </div>
                <span className="text-sm font-medium text-foreground">{field}</span>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Your data is safe</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bank details are collected and stored securely by Stripe. Stokivo never sees or stores your banking information.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => setStep(2)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button className="flex-1 h-12 bg-accent text-accent-foreground hover:bg-accent/90 gap-2" onClick={() => setStep(4)}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Connect */}
      {step === 4 && (
        <div className="space-y-5">
          <div>
            <h3 className="font-display font-bold text-lg text-foreground">Ready to connect your bank</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You'll be redirected to a secure page to enter your bank details
            </p>
          </div>
          <div className="p-5 rounded-2xl border bg-muted/30 space-y-3">
            <h4 className="text-sm font-semibold text-foreground mb-2">Summary</h4>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Account type</span>
              <span className="text-sm font-medium text-foreground capitalize">{accountType}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Country</span>
              <span className="text-sm font-medium text-foreground">
                {COUNTRIES.find(c => c.code === country)?.flag} {COUNTRIES.find(c => c.code === country)?.name}
              </span>
            </div>
            <Separator />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => setStep(3)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              className="flex-1 h-12 bg-accent text-accent-foreground hover:bg-accent/90 gap-2 font-semibold"
              onClick={handleConnectStripe}
              disabled={connecting}
            >
              {connecting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Setting up...</>
              ) : (
                <><Banknote className="h-4 w-4" /> Connect Bank Account</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
        <h4 className="text-sm font-semibold text-foreground mb-2">How Stokivo payouts work</h4>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>1. Connect your bank account securely through Stripe</p>
          <p>2. Send payment links to customers for invoices</p>
          <p>3. Customer pays → funds go directly to your bank</p>
        </div>
      </div>
    </div>
  );
}
