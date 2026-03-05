import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { demoProducts, demoSuppliers } from "@/lib/demo-data";
import { formatMoney } from "@/lib/currency";
import { AlertTriangle, Package, ShoppingCart, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function LowStockAlerts() {
  const lowStockProducts = demoProducts
    .filter((p) => p.stockQty <= p.minStockLevel)
    .sort((a, b) => (a.stockQty / a.minStockLevel) - (b.stockQty / b.minStockLevel));

  const criticalCount = lowStockProducts.filter((p) => p.stockQty <= p.minStockLevel * 0.5).length;
  const warningCount = lowStockProducts.length - criticalCount;

  // Category-based summary
  const categoryMap = new Map<string, { total: number; low: number; critical: number }>();
  demoProducts.forEach((p) => {
    const cat = p.category;
    if (!categoryMap.has(cat)) categoryMap.set(cat, { total: 0, low: 0, critical: 0 });
    const entry = categoryMap.get(cat)!;
    entry.total++;
    if (p.stockQty <= p.minStockLevel) {
      entry.low++;
      if (p.stockQty <= p.minStockLevel * 0.5) entry.critical++;
    }
  });
  const categoriesWithIssues = Array.from(categoryMap.entries())
    .filter(([, v]) => v.low > 0)
    .sort((a, b) => b[1].critical - a[1].critical);

  // Reorder suggestions
  const reorderList = lowStockProducts.map((p) => {
    const supplier = demoSuppliers.find((s) => s.id === p.supplierId);
    const suggestedQty = Math.max(p.minStockLevel * 2 - p.stockQty, p.minStockLevel);
    const estimatedCost = suggestedQty * p.costPrice;
    return { ...p, supplier, suggestedQty, estimatedCost };
  });
  const totalReorderCost = reorderList.reduce((s, r) => s + r.estimatedCost, 0);

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Smart Stock Alerts"
        subtitle={`${lowStockProducts.length} products need attention`}
        actions={
          <Button variant="outline" className="gap-2">
            <ShoppingCart className="h-4 w-4" /> Export Reorder List
          </Button>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="zentra-card p-4 border-destructive/20">
          <p className="text-xs text-muted-foreground font-medium">Critical</p>
          <p className="text-2xl font-display font-bold text-destructive mt-1">{criticalCount}</p>
          <p className="text-[10px] text-muted-foreground">≤50% of minimum</p>
        </div>
        <div className="zentra-card p-4 border-warning/20">
          <p className="text-xs text-muted-foreground font-medium">Warning</p>
          <p className="text-2xl font-display font-bold text-warning mt-1">{warningCount}</p>
          <p className="text-[10px] text-muted-foreground">Below minimum</p>
        </div>
        <div className="zentra-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Categories Affected</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{categoriesWithIssues.length}</p>
        </div>
        <div className="zentra-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Reorder Cost (Est.)</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{formatMoney(totalReorderCost)}</p>
        </div>
      </div>

      {/* Category Alerts */}
      {categoriesWithIssues.length > 0 && (
        <div className="zentra-card p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-4 w-4 text-accent" />
            <h3 className="font-display font-semibold text-foreground text-sm">Category Overview</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoriesWithIssues.map(([cat, data]) => (
              <div key={cat} className={`p-3 rounded-lg border ${data.critical > 0 ? "border-destructive/20 bg-destructive/[0.02]" : "border-warning/20 bg-warning/[0.02]"}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-foreground">{cat}</span>
                  <span className="text-xs text-muted-foreground">{data.low}/{data.total} low</span>
                </div>
                <Progress value={((data.total - data.low) / data.total) * 100} className="h-1.5" />
                {data.critical > 0 && (
                  <p className="text-[10px] text-destructive mt-1 font-medium">{data.critical} critical</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Alerts */}
      <div className="space-y-3 mb-8">
        {lowStockProducts.map((product) => {
          const severity = product.stockQty <= product.minStockLevel * 0.5 ? "critical" : "warning";
          const stockPct = Math.round((product.stockQty / product.minStockLevel) * 100);
          const supplier = demoSuppliers.find((s) => s.id === product.supplierId);

          return (
            <div
              key={product.id}
              className={`zentra-card p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
                severity === "critical" ? "border-destructive/30 bg-destructive/[0.02]" : "border-warning/30 bg-warning/[0.02]"
              }`}
            >
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                severity === "critical" ? "bg-destructive/10" : "bg-warning/10"
              }`}>
                <AlertTriangle className={`h-5 w-5 ${severity === "critical" ? "text-destructive" : "text-warning"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-foreground">{product.name}</p>
                  <StatusBadge status={severity} />
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{product.category}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  <span className="font-semibold text-foreground">{product.stockQty}</span> left of {product.minStockLevel} min
                  {supplier && <> • Supplier: {supplier.name}</>}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={stockPct} className={`h-1.5 flex-1 max-w-[200px] ${severity === "critical" ? "[&>div]:bg-destructive" : "[&>div]:bg-warning"}`} />
                  <span className="text-xs text-muted-foreground">{stockPct}%</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm">View</Button>
                <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5">
                  <ShoppingCart className="h-3 w-3" /> Reorder
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reorder Suggestion List */}
      <div className="zentra-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-accent" />
            <h3 className="font-display font-semibold text-foreground text-sm">Reorder Suggestions</h3>
          </div>
          <span className="text-xs text-muted-foreground">Total est.: {formatMoney(totalReorderCost)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium text-muted-foreground">Product</th>
                <th className="pb-2 font-medium text-muted-foreground">Current</th>
                <th className="pb-2 font-medium text-muted-foreground">Min</th>
                <th className="pb-2 font-medium text-muted-foreground">Suggested Qty</th>
                <th className="pb-2 font-medium text-muted-foreground">Supplier</th>
                <th className="pb-2 font-medium text-muted-foreground text-right">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {reorderList.map((r) => (
                <tr key={r.id} className="border-b border-muted/50 last:border-0">
                  <td className="py-2.5 font-medium text-foreground">{r.name}</td>
                  <td className={`py-2.5 font-semibold ${r.stockQty <= r.minStockLevel * 0.5 ? "text-destructive" : "text-warning"}`}>{r.stockQty}</td>
                  <td className="py-2.5 text-muted-foreground">{r.minStockLevel}</td>
                  <td className="py-2.5 font-medium text-accent">{r.suggestedQty} {r.unitType}s</td>
                  <td className="py-2.5 text-muted-foreground">{r.supplier?.name || "—"}</td>
                  <td className="py-2.5 text-right font-medium text-foreground">{formatMoney(r.estimatedCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
