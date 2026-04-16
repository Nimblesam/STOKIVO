import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Clock, LogOut, RefreshCw } from "lucide-react";
import stokivoLogo from "@/assets/stokivo-logo.png";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function PendingApproval() {
  const { signOut, refreshProfile, company, user, profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (company && company.status === "active") {
      navigate("/dashboard", { replace: true });
      return;
    }

    // If we have a company_id but the company is missing/pending, subscribe to live updates.
    // When the platform admin approves, we'll auto-redirect to the dashboard.
    if (!profile?.company_id) return;
    const companyId = profile.company_id;
    const channel = supabase
      .channel(`company-status-${companyId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "companies", filter: `id=eq.${companyId}` },
        async (payload) => {
          const next = (payload.new as { status?: string } | null)?.status;
          if (next === "active") {
            toast.success("Your account has been approved! Welcome to Stokivo.");
            await refreshProfile();
            navigate("/dashboard", { replace: true });
          }
        }
      )
      .subscribe();

    // Soft-poll every 30s as a backup in case realtime drops
    const interval = setInterval(() => { void refreshProfile(); }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user, company, profile?.company_id, navigate, refreshProfile]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <img src={stokivoLogo} alt="Stokivo" className="h-16 w-16 rounded-2xl" />
        </div>

        <div className="space-y-3">
          <div className="mx-auto h-20 w-20 rounded-full bg-warning/10 flex items-center justify-center">
            <Clock className="h-10 w-10 text-warning" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Account Under Review</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Thank you for signing up{company?.name ? ` with ${company.name}` : ""}! Your account is currently being reviewed by our team. 
            This usually takes less than 24 hours.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">What happens next?</h3>
          <ul className="text-left space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
              Our team verifies your business details
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
              You'll receive an email once approved
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</span>
              Full access to all features on your plan
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleRefresh} variant="outline" className="w-full gap-2" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Check Status
          </Button>
          <Button onClick={signOut} variant="ghost" className="w-full gap-2 text-muted-foreground">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Need help? Contact us at{" "}
          <a href="mailto:support@stokivo.com" className="text-primary underline">support@stokivo.com</a>
        </p>
      </div>
    </div>
  );
}
