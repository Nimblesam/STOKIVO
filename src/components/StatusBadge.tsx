import type { InvoiceStatus, AlertSeverity } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: InvoiceStatus | AlertSeverity | 'active' | 'inactive' | 'low_stock' | 'in_stock' | 'healthy';
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-success/10 text-success border-success/20" },
  sent: { label: "Sent", className: "bg-info/10 text-info border-info/20" },
  partially_paid: { label: "Partial", className: "bg-warning/10 text-warning-foreground border-warning/20" },
  overdue: { label: "Overdue", className: "bg-destructive/10 text-destructive border-destructive/20" },
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  warning: { label: "Warning", className: "bg-warning/10 text-warning-foreground border-warning/20" },
  critical: { label: "Critical", className: "bg-destructive/10 text-destructive border-destructive/20" },
  active: { label: "Active", className: "bg-success/10 text-success border-success/20" },
  inactive: { label: "Inactive", className: "bg-muted text-muted-foreground border-border" },
  low_stock: { label: "Low Stock", className: "bg-warning/10 text-warning-foreground border-warning/20" },
  in_stock: { label: "In Stock", className: "bg-success/10 text-success border-success/20" },
  healthy: { label: "Healthy", className: "bg-success/10 text-success border-success/20" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
