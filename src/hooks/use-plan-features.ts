import { useAuth } from "@/contexts/AuthContext";
import type { PlanTier } from "@/lib/types";

const PLAN_HIERARCHY: Record<PlanTier, number> = {
  starter: 0,
  growth: 1,
  pro: 2,
};

export type Feature =
  | "multi_location"
  | "expiry_alerts"
  | "ai_insights"
  | "ai_forecasting"
  | "custom_domain"
  | "multi_warehouse"
  | "full_automation"
  | "advanced_analytics"
  | "barcode_generation"
  | "invoicing"
  | "supplier_management"
  | "stripe_payouts"
  | "rbac_advanced";

const FEATURE_MIN_PLAN: Record<Feature, PlanTier> = {
  multi_location: "growth",
  expiry_alerts: "growth",
  ai_insights: "growth",
  barcode_generation: "growth",
  invoicing: "starter",
  supplier_management: "starter",
  ai_forecasting: "pro",
  custom_domain: "pro",
  multi_warehouse: "pro",
  full_automation: "pro",
  advanced_analytics: "growth",
  stripe_payouts: "starter",
  rbac_advanced: "pro",
};

export interface PlanLimits {
  maxUsers: number;
  maxProducts: number;
  multiStore: boolean;
}

const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  starter: { maxUsers: 2, maxProducts: 500, multiStore: false },
  growth: { maxUsers: 8, maxProducts: Infinity, multiStore: true },
  pro: { maxUsers: Infinity, maxProducts: Infinity, multiStore: true },
};

export function usePlanFeatures() {
  const { company } = useAuth();
  const currentPlan: PlanTier = (company?.plan as PlanTier) || "starter";
  const currentLevel = PLAN_HIERARCHY[currentPlan];
  const limits = PLAN_LIMITS[currentPlan];

  const hasFeature = (feature: Feature): boolean => {
    const requiredPlan = FEATURE_MIN_PLAN[feature];
    return currentLevel >= PLAN_HIERARCHY[requiredPlan];
  };

  const requiredPlanFor = (feature: Feature): PlanTier => FEATURE_MIN_PLAN[feature];

  const isPro = currentPlan === "pro";
  const isGrowthOrAbove = currentLevel >= 1;

  const canAddProduct = (currentCount: number): boolean => currentCount < limits.maxProducts;
  const canAddUser = (currentCount: number): boolean => currentCount < limits.maxUsers;
  const canUseMultiStore = limits.multiStore;

  return {
    currentPlan,
    hasFeature,
    requiredPlanFor,
    isPro,
    isGrowthOrAbove,
    limits,
    canAddProduct,
    canAddUser,
    canUseMultiStore,
  };
}
