import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { demoAlerts, demoPriceHistory, demoSuppliers, demoProducts } from "@/lib/demo-data";
import { formatMoney } from "@/lib/currency";
import { TrendingDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PriceChangeAlerts() {
  const priceAlerts = demoAlerts.filter((a) => a.type === "SUPPLIER_PRICE_CHANGE");

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Price Change Center"
        subtitle="Track supplier cost changes and margin impact"
      />

      <div className="space-y-3">
        {demoPriceHistory.map((change) => {
          const product = demoProducts.find((p) => p.id === change.productId);
          const supplier = demoSuppliers.find((s) => s.id === change.supplierId);
          const pctChange = ((change.newCost - change.oldCost) / change.oldCost * 100).toFixed(1);
          const isIncrease = change.newCost > change.oldCost;
          const newMargin = product ? ((product.sellingPrice - change.newCost) / product.sellingPrice * 100).toFixed(1) : "—";
          const marginRisk = product && Number(newMargin) < 10;

          return (
            <div key={change.id} className={`zentra-card p-5 ${marginRisk ? "border-destructive/30" : "border-warning/30"}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                  marginRisk ? "bg-destructive/10" : "bg-warning/10"
                }`}>
                  <TrendingDown className={`h-5 w-5 ${marginRisk ? "text-destructive" : "text-warning"}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{product?.name}</p>
                    {marginRisk && <StatusBadge status="critical" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Supplier: {supplier?.name} • {change.changedAt}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-sm text-muted-foreground line-through">{formatMoney(change.oldCost)}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-bold text-foreground">{formatMoney(change.newCost)}</span>
                    </div>
                    <p className={`text-xs font-medium ${isIncrease ? "text-destructive" : "text-success"}`}>
                      {isIncrease ? "+" : ""}{pctChange}% • Margin: {newMargin}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
