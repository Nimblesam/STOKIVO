import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Clock, LogOut, RefreshCw } from "lucide-react";
import stokivoLogo from "@/assets/stokivo-logo.png";
import { useState } from "react";

export default function PendingApproval() {
  const { signOut, refreshProfile, company } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

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
