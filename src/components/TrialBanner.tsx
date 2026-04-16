import { Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTrialStatus } from "@/hooks/use-trial-status";

export function TrialBanner() {
  const navigate = useNavigate();
  const { loading, isTrialing, isExpired, daysRemaining } = useTrialStatus();

  if (loading || (!isTrialing && !isExpired)) return null;

  const critical = isExpired || daysRemaining <= 3;

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2 border-b text-sm ${
        critical
          ? "bg-destructive/10 text-destructive border-destructive/20"
          : "bg-accent/10 text-accent-foreground border-accent/20"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {critical ? (
          <AlertTriangle className="h-4 w-4 shrink-0" />
        ) : (
          <Sparkles className="h-4 w-4 shrink-0 text-accent" />
        )}
        <p className="truncate font-medium">
          {isExpired
            ? "Your free trial has ended. Upgrade to keep using Stokivo."
            : daysRemaining === 0
              ? "Your trial ends today — upgrade to continue."
              : daysRemaining === 1
                ? "Your trial ends tomorrow — upgrade to continue."
                : `${daysRemaining} days left in your free trial.`}
        </p>
      </div>
      <Button
        size="sm"
        variant={critical ? "destructive" : "default"}
        className="shrink-0"
        onClick={() => navigate("/settings?tab=billing")}
      >
        {isExpired ? "Upgrade now" : "Upgrade"}
      </Button>
    </div>
  );
}
