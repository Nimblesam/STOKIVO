import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { demoAlerts, demoPriceHistory, demoSuppliers, demoProducts } from "@/lib/demo-data";
import { formatMoney } from "@/lib/currency";
import { TrendingDown, TrendingUp, ArrowRight, AlertTriangle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

export default function PriceChangeAlerts() {
  const priceAlerts = demoAlerts.filter((a) => a.type === "SUPPLIER_PRICE_CHANGE");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const selectedProduct = demoProducts.find((p) => p.id === selectedProductId);
  const selectedHistory = demoPriceHistory
    .filter((h) => h.productId === selectedProductId)
    .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());

  // Build chart data for selected product
  const chartData = selectedHistory.map((h, i) => ({
    date: new Date(h.changedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    cost: h.newCost / 100,
    oldCost: i === 0 ? h.oldCost / 100 : undefined,
  }));
  // Prepend the original cost
  if (selectedHistory.length > 0) {
    chartData.unshift({
      date: "Original",
      cost: selectedHistory[0].oldCost / 100,
      oldCost: undefined,
    });
  }

  // Summary stats
  const totalIncreases = demoPriceHistory.filter((h) => h.newCost > h.oldCost).length;
  const totalDecreases = demoPriceHistory.filter((h) => h.newCost < h.oldCost).length;
  const affectedProducts = new Set(demoPriceHistory.map((h) => h.productId)).size;
  const marginRiskProducts = demoPriceHistory.filter((h) => {
    const p = demoProducts.find((pr) => pr.id === h.productId);
    if (!p) return false;
    const newMargin = ((p.sellingPrice - h.newCost) / p.sellingPrice) * 100;
    return newMargin < 10;
  });

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Price Change Center"
        subtitle="Track supplier cost changes, margin impact, and pricing intelligence"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="zentra-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Total Changes</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{demoPriceHistory.length}</p>
        </div>
        <div className="zentra-card p-4 border-destructive/20">
          <p className="text-xs text-muted-foreground font-medium">Price Increases</p>
          <p className="text-2xl font-display font-bold text-destructive mt-1">{totalIncreases}</p>
        </div>
        <div className="zentra-card p-4 border-success/20">
          <p className="text-xs text-muted-foreground font-medium">Price Decreases</p>
          <p className="text-2xl font-display font-bold text-success mt-1">{totalDecreases}</p>
        </div>
        <div className="zentra-card p-4 border-warning/20">
          <p className="text-xs text-muted-foreground font-medium">Margin at Risk</p>
          <p className="text-2xl font-display font-bold text-warning mt-1">{marginRiskProducts.length}</p>
        </div>
      </div>

      {/* Affected Products */}
      <div className="space-y-3">
        {demoPriceHistory.map((change) => {
          const product = demoProducts.find((p) => p.id === change.productId);
          const supplier = demoSuppliers.find((s) => s.id === change.supplierId);
          const pctChange = ((change.newCost - change.oldCost) / change.oldCost * 100).toFixed(1);
          const isIncrease = change.newCost > change.oldCost;
          const newMargin = product ? ((product.sellingPrice - change.newCost) / product.sellingPrice * 100) : 0;
          const marginRisk = newMargin < 10;
          const suggestedPrice = product ? Math.ceil((change.newCost / 0.7)) : 0; // target 30% margin

          return (
            <div
              key={change.id}
              className={`zentra-card p-5 transition-all ${
                marginRisk
                  ? "border-destructive/30 bg-destructive/[0.02]"
                  : isIncrease
                  ? "border-warning/30 bg-warning/[0.02]"
                  : "border-success/30 bg-success/[0.02]"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                  marginRisk ? "bg-destructive/10" : isIncrease ? "bg-warning/10" : "bg-success/10"
                }`}>
                  {isIncrease
                    ? <TrendingUp className={`h-5 w-5 ${marginRisk ? "text-destructive" : "text-warning"}`} />
                    : <TrendingDown className="h-5 w-5 text-success" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{product?.name}</p>
                    {marginRisk && <StatusBadge status="critical" />}
                    {isIncrease && !marginRisk && <StatusBadge status="warning" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Supplier: {supplier?.name} • {new Date(change.changedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {/* Price Change Display */}
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-sm text-muted-foreground line-through">{formatMoney(change.oldCost)}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-bold text-foreground">{formatMoney(change.newCost)}</span>
                    </div>
                    <p className={`text-xs font-medium ${isIncrease ? "text-destructive" : "text-success"}`}>
                      {isIncrease ? "+" : ""}{pctChange}% • Margin: {newMargin.toFixed(1)}%
                    </p>
                  </div>

                  {/* Suggested Price */}
                  {marginRisk && product && (
                    <div className="border-l pl-4 text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Suggested Price</p>
                      <p className="text-sm font-bold text-accent">{formatMoney(suggestedPrice)}</p>
                    </div>
                  )}

                  {/* History Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setSelectedProductId(change.productId)}
                  >
                    <BarChart3 className="h-3.5 w-3.5" /> History
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Price History Dialog */}
      <Dialog open={!!selectedProductId} onOpenChange={() => setSelectedProductId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-accent" />
              {selectedProduct?.name} — Price History
            </DialogTitle>
          </DialogHeader>

          {chartData.length > 0 && (
            <div className="py-4">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(215, 15%, 50%)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 15%, 50%)" tickFormatter={(v) => `£${v}`} />
                  <Tooltip formatter={(v: number) => [`£${v.toFixed(2)}`, "Cost"]} />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="hsl(170, 60%, 40%)"
                    strokeWidth={2}
                    dot={{ r: 5, fill: "hsl(170, 60%, 40%)" }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>

              <div className="mt-4 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Change Log</h4>
                {selectedHistory.map((h) => {
                  const sup = demoSuppliers.find((s) => s.id === h.supplierId);
                  const isUp = h.newCost > h.oldCost;
                  return (
                    <div key={h.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">{new Date(h.changedAt).toLocaleDateString("en-GB")}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{formatMoney(h.oldCost)}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className={`font-medium ${isUp ? "text-destructive" : "text-success"}`}>{formatMoney(h.newCost)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
