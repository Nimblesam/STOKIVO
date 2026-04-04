import { Badge } from "@/components/ui/badge";
import { Crown, Rocket, Zap, Lock } from "lucide-react";
import type { PlanTier } from "@/lib/types";
import { usePlanFeatures, type Feature } from "@/hooks/use-plan-features";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useState } from "react";

const PLAN_META: Record<PlanTier, { label: string; icon: any; className: string }> = {
  starter: { label: "Starter", icon: Zap, className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
  growth: { label: "Growth", icon: Rocket, className: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border-violet-200 dark:border-violet-800" },
  pro: { label: "Pro", icon: Crown, className: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
};

interface PlanBadgeProps {
  feature: Feature;
  showUpgradeOnClick?: boolean;
}

export function PlanBadge({ feature, showUpgradeOnClick = true }: PlanBadgeProps) {
  const { hasFeature, requiredPlanFor, currentPlan } = usePlanFeatures();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (hasFeature(feature)) return null;

  const requiredPlan = requiredPlanFor(feature);
  const meta = PLAN_META[requiredPlan];
  const Icon = meta.icon;

  return (
    <>
      <Badge
        variant="outline"
        className={`gap-1 cursor-pointer text-[10px] ${meta.className}`}
        onClick={(e) => {
          e.stopPropagation();
          if (showUpgradeOnClick) setShowUpgrade(true);
        }}
      >
        <Lock className="h-2.5 w-2.5" />
        {meta.label}
      </Badge>
      {showUpgradeOnClick && (
        <UpgradeModal
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          requiredPlan={requiredPlan}
          featureLabel={feature.replace(/_/g, " ")}
          currentPlan={currentPlan}
        />
      )}
    </>
  );
}
