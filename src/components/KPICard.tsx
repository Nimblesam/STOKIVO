import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  trend?: { value: string; positive: boolean };
  variant?: "default" | "warning" | "critical" | "success";
}

export function KPICard({ title, value, subtitle, icon, trend, variant = "default" }: KPICardProps) {
  const variantStyles = {
    default: "border-border",
    warning: "border-warning/30 bg-warning/5",
    critical: "border-destructive/30 bg-destructive/5",
    success: "border-success/30 bg-success/5",
  };

  return (
    <div className={cn("zentra-card p-5", variantStyles[variant])}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      <div className="flex items-center gap-2 mt-1">
        {trend && (
          <span
            className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded",
              trend.positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}
          >
            {trend.positive ? "↑" : "↓"} {trend.value}
          </span>
        )}
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
    </div>
  );
}
