import { useEffect, useState } from "react";
import { useAppMode } from "@/contexts/AppModeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import loginHero from "@/assets/login-hero.jpg";
import { Package, BarChart3, CreditCard, ShieldCheck, Loader2, ArrowLeft } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { isFullMode } = useAppMode();
  const { mfaRequired, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaVerifying, setMfaVerifying] = useState(false);

  // Sync MFA factor when context detects MFA is required (covers refresh / direct landing).
  useEffect(() => {
    if (mfaRequired && !mfaFactorId) {
      supabase.auth.mfa.listFactors().then(({ data }) => {
        const verified = data?.totp?.filter(f => f.status === "verified") || [];
        if (verified.length > 0) setMfaFactorId(verified[0].id);
      });
    }
  }, [mfaRequired, mfaFactorId]);

  const mfaStep = mfaRequired;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    // AuthContext listener will detect whether MFA is needed.
    // If MFA enrolled → mfaRequired flips to true → MFA panel renders.
    // If no MFA → profile hydrates → PublicRoute redirects to dashboard.
    setLoading(false);
  };

  const handleMfaVerify = async () => {
    if (mfaCode.length !== 6) { toast.error("Enter a 6-digit code"); return; }
    if (!mfaFactorId) { toast.error("MFA factor not loaded. Please refresh and try again."); return; }
    setMfaVerifying(true);
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: mfaCode,
      });
      if (vErr) throw vErr;
      toast.success("Verified — signing you in…");
      // Force refresh of MFA + profile state, then navigate to dashboard.
      await refreshProfile();
      navigate("/", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Invalid code. Please try again.");
      setMfaCode("");
    }
    setMfaVerifying(false);
  };

  const features = [
    { icon: Package, label: "Inventory Management", desc: "Track stock in real-time" },
    { icon: BarChart3, label: "Sales Analytics", desc: "Data-driven insights" },
    { icon: CreditCard, label: "Credit Ledger", desc: "Manage customer credit" },
    { icon: ShieldCheck, label: "Secure Payments", desc: "Stripe-powered payouts" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left panel — Hero */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <img src={loginHero} alt="Warehouse management" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-accent/90 via-accent/70 to-black/60" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <span className="font-display font-bold text-lg">S</span>
              </div>
              <span className="font-display font-bold text-2xl tracking-tight">Stokivo</span>
            </div>
            <p className="text-white/70 text-sm">Smart Stock. Strong Business.</p>
          </div>

          <div className="space-y-8">
            <div>
              <h1 className="text-4xl xl:text-5xl font-display font-bold leading-tight">
                Run your wholesale<br />business smarter.
              </h1>
              <p className="text-white/80 text-lg mt-4 max-w-md">
                Inventory, invoicing, customer credit, and analytics — all in one powerful platform.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {features.map((f) => (
                <div key={f.label} className="flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                  <div className="h-9 w-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{f.label}</p>
                    <p className="text-xs text-white/60">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/40 text-xs">© {new Date().getFullYear()} Stokivo. Smart Stock. Strong Business.</p>
        </div>
      </div>

      {/* Right panel — Login form */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 lg:p-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="h-12 w-12 rounded-xl stokivo-gradient flex items-center justify-center mx-auto mb-3">
              <span className="text-accent-foreground font-display font-bold text-lg">S</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">Stokivo</h1>
          </div>

          {mfaStep ? (
            <div className="space-y-6">
              <div className="mb-8">
                <h2 className="text-2xl font-display font-bold text-foreground">Two-Factor Authentication</h2>
                <p className="text-sm text-muted-foreground mt-1">Enter the 6-digit code from your authenticator app</p>
              </div>
              <div>
                <Label htmlFor="mfa-code">Verification Code</Label>
                <Input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="mt-1.5 h-11 text-center font-mono text-lg tracking-widest"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <Button
                onClick={handleMfaVerify}
                className="w-full h-11 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                disabled={mfaVerifying || mfaCode.length !== 6}
              >
                {mfaVerifying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying…</> : "Verify & Sign In"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => { setMfaStep(false); setMfaCode(""); supabase.auth.signOut(); }}>
                Back to Login
              </Button>
            </div>
          ) : (
            <>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
              >
                <ArrowLeft className="h-4 w-4" /> Back to home
              </Link>
              <div className="mb-8">
                <h2 className="text-2xl font-display font-bold text-foreground">Welcome back</h2>
                <p className="text-sm text-muted-foreground mt-1">Sign in to manage your business</p>
              </div>

              <div className="space-y-6">
                {isFullMode && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2 h-11"
                      disabled={loading}
                      onClick={async () => {
                        setLoading(true);
                        const { error } = await lovable.auth.signInWithOAuth("google", {
                          redirect_uri: window.location.origin,
                        });
                        if (error) {
                          toast.error(error.message || "Google sign-in failed");
                          setLoading(false);
                        }
                      }}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                      Continue with Google
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or sign in with email</span></div>
                    </div>
                  </>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email address</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@business.com" className="mt-1.5 h-11" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link to="/forgot-password" className="text-xs text-accent hover:underline">Forgot password?</Link>
                    </div>
                    <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="mt-1.5 h-11" />
                  </div>
                  <Button type="submit" className="w-full h-11 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link to="/register" className="text-accent hover:underline font-medium">Create one free</Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
