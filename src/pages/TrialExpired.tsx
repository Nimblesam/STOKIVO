import { Lock, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function TrialExpired() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-lg w-full">
        <div className="stokivo-card p-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl stokivo-gradient flex items-center justify-center mb-5">
            <Lock className="h-7 w-7 text-accent-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Your free trial has ended
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Thanks for trying Stokivo! To keep managing your inventory, sales, and customers,
            choose a plan and upgrade in seconds.
          </p>

          <div className="text-left space-y-2 mb-6 px-2">
            {[
              "Keep all your products, customers & sales history",
              "Continue using POS, invoicing & payment links",
              "Access analytics, AI insights & multi-store",
              "Cancel anytime — no contracts",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <Button
            size="lg"
            className="w-full gap-2"
            onClick={() => navigate("/settings?tab=billing")}
          >
            <Sparkles className="h-4 w-4" />
            Choose a plan & upgrade
          </Button>
          <button
            onClick={async () => { await signOut(); navigate("/login"); }}
            className="text-xs text-muted-foreground hover:text-foreground mt-4 underline"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
