import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Rocket, Zap } from "lucide-react";
import type { PlanTier } from "@/lib/types";
import { useNavigate } from "react-router-dom";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredPlan: PlanTier;
  featureLabel: string;
  currentPlan: PlanTier;
}

const PLAN_DISPLAY: Record<PlanTier, { label: string; icon: any; color: string; price: string }> = {
  starter: { label: "Starter", icon: Zap, color: "text-emerald-500", price: "£19/mo" },
  growth: { label: "Growth", icon: Rocket, color: "text-violet-500", price: "£39/mo" },
  pro: { label: "Pro", icon: Crown, color: "text-amber-500", price: "£79/mo" },
};

export function UpgradeModal({ open, onOpenChange, requiredPlan, featureLabel, currentPlan }: UpgradeModalProps) {
  const navigate = useNavigate();
  const target = PLAN_DISPLAY[requiredPlan];
  const TargetIcon = target.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader className="items-center">
          <div className={`h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-2 ${target.color}`}>
            <TargetIcon className="h-7 w-7" />
          </div>
          <DialogTitle className="text-lg">Upgrade to {target.label}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            <strong>{featureLabel}</strong> is available on the{" "}
            <span className={`font-semibold ${target.color}`}>{target.label}</span> plan ({target.price}).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <Button
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              navigate("/settings?tab=billing");
            }}
          >
            View Plans & Upgrade
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
