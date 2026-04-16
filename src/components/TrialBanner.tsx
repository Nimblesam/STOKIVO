import { Sparkles, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTrialStatus } from "@/hooks/use-trial-status";

export function TrialBanner() {
  const navigate = useNavigate();
  const {
    loading,
    isTrialing,
    isExpired,
    daysRemaining,
    status,
    cancelAtPeriodEnd,
    currentPeriodEnd,
  } = useTrialStatus();

  if (loading) return null;

  // Determine banner state
  const isPastDue = status === "past_due" || status === "unpaid";
  const isCanceled = status === "canceled" || status === "incomplete_expired";
  const willCancel = cancelAtPeriodEnd && status === "active";

  // Hide for clean active subscriptions with no warnings
  if (!isTrialing && !isExpired && !isPastDue && !isCanceled && !willCancel) return null;

  const critical = isExpired || isPastDue || isCanceled || (isTrialing && daysRemaining <= 3);

  let Icon = Sparkles;
  let message = "";
  let cta = "Upgrade";

  if (isPastDue) {
    Icon = AlertTriangle;
    message = "Your payment failed. Update your billing details to keep access.";
    cta = "Update billing";
  } else if (isCanceled) {
    Icon = XCircle;
    message = "Your subscription has been canceled. Resubscribe to restore access.";
    cta = "Resubscribe";
  } else if (willCancel) {
    Icon = AlertTriangle;
    const endDate = currentPeriodEnd
      ? new Date(currentPeriodEnd).toLocaleDateString()
      : "the period end";
    message = `Your subscription will cancel on ${endDate}. Reactivate to continue.`;
    cta = "Reactivate";
  } else if (isExpired) {
    Icon = AlertTriangle;
    message = "Your free trial has ended. Upgrade to keep using Stokivo.";
    cta = "Upgrade now";
  } else if (isTrialing) {
    Icon = critical ? AlertTriangle : Sparkles;
    if (daysRemaining === 0) message = "Your trial ends today — upgrade to continue.";
    else if (daysRemaining === 1) message = "Your trial ends tomorrow — upgrade to continue.";
    else message = `${daysRemaining} days left in your free trial.`;
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2 border-b text-sm ${
        critical
          ? "bg-destructive/10 text-destructive border-destructive/20"
          : "bg-accent/10 text-accent-foreground border-accent/20"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon className={`h-4 w-4 shrink-0 ${critical ? "" : "text-accent"}`} />
        <p className="truncate font-medium">{message}</p>
      </div>
      <Button
        size="sm"
        variant={critical ? "destructive" : "default"}
        className="shrink-0"
        onClick={() => navigate("/settings?tab=billing")}
      >
        {cta}
      </Button>
    </div>
  );
}
