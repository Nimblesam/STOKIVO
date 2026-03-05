import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { demoAlerts, demoProducts } from "@/lib/demo-data";
import { formatMoney } from "@/lib/currency";
import { AlertTriangle, Package, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LowStockAlerts() {
  const lowStockProducts = demoProducts.filter((p) => p.stockQty <= p.minStockLevel);
  const alerts = demoAlerts.filter((a) => a.type === "LOW_STOCK");

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Low Stock Alerts"
        subtitle={`${lowStockProducts.length} products need attention`}
        actions={
          <Button variant="outline" className="gap-2">
            <ShoppingCart className="h-4 w-4" /> Export Reorder List
          </Button>
        }
      />

      <div className="space-y-3">
        {lowStockProducts.map((product) => {
          const severity = product.stockQty <= product.minStockLevel * 0.5 ? "critical" : "warning";
          return (
            <div
              key={product.id}
              className={`zentra-card p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
                severity === "critical" ? "border-destructive/30" : "border-warning/30"
              }`}
            >
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                severity === "critical" ? "bg-destructive/10" : "bg-warning/10"
              }`}>
                <AlertTriangle className={`h-5 w-5 ${severity === "critical" ? "text-destructive" : "text-warning"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{product.name}</p>
                  <StatusBadge status={severity} />
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {product.stockQty} left — minimum: {product.minStockLevel} — Cost: {formatMoney(product.costPrice)}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm">View Product</Button>
                <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">Reorder</Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
