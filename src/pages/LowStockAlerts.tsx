import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Package, ShoppingCart, Layers, Loader2, Eye, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Currency } from "@/lib/types";

export default function LowStockAlerts() {
  const { profile, company } = useAuth();
  const currency = (company?.currency || "GBP") as Currency;
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const [{ data: prods }, { data: supps }] = await Promise.all([
      supabase.from("products").select("*").eq("company_id", profile.company_id),
      supabase.from("suppliers").select("*").eq("company_id", profile.company_id),
    ]);
    setProducts(prods || []);
    setSuppliers(supps || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile?.company_id]);

  const lowStockProducts = products
    .filter((p) => p.stock_qty <= p.min_stock_level && p.min_stock_level > 0)
    .sort((a, b) => (a.stock_qty / a.min_stock_level) - (b.stock_qty / b.min_stock_level));

  const criticalCount = lowStockProducts.filter((p) => p.stock_qty <= p.min_stock_level * 0.5).length;
  const warningCount = lowStockProducts.length - criticalCount;

  const categoryMap = new Map<string, { total: number; low: number; critical: number }>();
  products.forEach((p) => {
    const cat = p.category || "Uncategorized";
    if (!categoryMap.has(cat)) categoryMap.set(cat, { total: 0, low: 0, critical: 0 });
    const entry = categoryMap.get(cat)!;
    entry.total++;
    if (p.stock_qty <= p.min_stock_level && p.min_stock_level > 0) {
      entry.low++;
      if (p.stock_qty <= p.min_stock_level * 0.5) entry.critical++;
    }
  });
  const categoriesWithIssues = Array.from(categoryMap.entries())
    .filter(([, v]) => v.low > 0)
    .sort((a, b) => b[1].critical - a[1].critical);

  const reorderList = lowStockProducts.map((p) => {
    const supplier = suppliers.find((s) => s.id === p.supplier_id);
    const suggestedQty = Math.max(p.min_stock_level * 2 - p.stock_qty, p.min_stock_level);
    const estimatedCost = suggestedQty * p.cost_price;
    return { ...p, supplier, suggestedQty, estimatedCost };
  });
  const totalReorderCost = reorderList.reduce((s, r) => s + r.estimatedCost, 0);

  const handleExportReorder = () => {
    const lines = ["Product,Current Stock,Min Level,Suggested Qty,Supplier,Est. Cost"];
    reorderList.forEach((r) => {
      lines.push(`"${r.name}",${r.stock_qty},${r.min_stock_level},${r.suggestedQty},"${r.supplier?.name || "N/A"}",${(r.estimatedCost / 100).toFixed(2)}`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reorder-list.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Reorder list exported as CSV");
  };

  const handleReorder = (product: any) => {
    const supplier = suppliers.find((s) => s.id === product.supplier_id);
    if (!supplier) { toast.error("No supplier linked to this product"); return; }
    const num = supplier.whatsapp || supplier.phone;
    if (!num) { toast.error("Supplier has no phone/WhatsApp number"); return; }
    const suggestedQty = Math.max(product.min_stock_level * 2 - product.stock_qty, product.min_stock_level);
    const msg = encodeURIComponent(
      `Hi ${supplier.name},\n\nI'd like to reorder:\n- ${product.name}: ${suggestedQty} units\n\nPlease confirm availability and price.\n\nThank you!`
    );
    window.open(`https://wa.me/${num.replace(/[^0-9]/g, "")}?text=${msg}`);
    toast.success("Reorder message opened in WhatsApp");
  };

  const handleView = (product: any) => {
    toast.info(`${product.name}: ${product.stock_qty} in stock (min: ${product.min_stock_level})`);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Smart Stock Alerts"
        subtitle={`${lowStockProducts.length} products need attention`}
        actions={
          <Button variant="outline" className="gap-2" onClick={handleExportReorder}>
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
          <p className="text-2xl font-display font-bold text-foreground mt-1">{formatMoney(totalReorderCost, currency)}</p>
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
          const severity = product.stock_qty <= product.min_stock_level * 0.5 ? "critical" : "warning";
          const stockPct = Math.round((product.stock_qty / product.min_stock_level) * 100);
          const supplier = suppliers.find((s) => s.id === product.supplier_id);

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
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{product.category || "Uncategorized"}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  <span className="font-semibold text-foreground">{product.stock_qty}</span> left of {product.min_stock_level} min
                  {supplier && <> • Supplier: {supplier.name}</>}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={stockPct} className={`h-1.5 flex-1 max-w-[200px] ${severity === "critical" ? "[&>div]:bg-destructive" : "[&>div]:bg-warning"}`} />
                  <span className="text-xs text-muted-foreground">{stockPct}%</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => handleView(product)}>View</Button>
                <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5" onClick={() => handleReorder(product)}>
                  <ShoppingCart className="h-3 w-3" /> Reorder
                </Button>
              </div>
            </div>
          );
        })}
        {lowStockProducts.length === 0 && (
          <div className="zentra-card p-12 text-center text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>All products are well-stocked!</p>
          </div>
        )}
      </div>

      {/* Reorder Suggestion List */}
      {reorderList.length > 0 && (
        <div className="zentra-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-accent" />
              <h3 className="font-display font-semibold text-foreground text-sm">Reorder Suggestions</h3>
            </div>
            <span className="text-xs text-muted-foreground">Total est.: {formatMoney(totalReorderCost, currency)}</span>
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
                    <td className={`py-2.5 font-semibold ${r.stock_qty <= r.min_stock_level * 0.5 ? "text-destructive" : "text-warning"}`}>{r.stock_qty}</td>
                    <td className="py-2.5 text-muted-foreground">{r.min_stock_level}</td>
                    <td className="py-2.5 font-medium text-accent">{r.suggestedQty} {r.unit_type}s</td>
                    <td className="py-2.5 text-muted-foreground">{r.supplier?.name || "—"}</td>
                    <td className="py-2.5 text-right font-medium text-foreground">{formatMoney(r.estimatedCost, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
