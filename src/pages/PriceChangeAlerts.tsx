import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TrendingDown, TrendingUp, ArrowRight, AlertTriangle, BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { Currency } from "@/lib/types";

export default function PriceChangeAlerts() {
  const { profile, company } = useAuth();
  const currency = (company?.currency || "GBP") as Currency;
  const [loading, setLoading] = useState(true);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.company_id) return;
    setLoading(true);
    Promise.all([
      supabase.from("supplier_price_history").select("*").order("changed_at", { ascending: false }),
      supabase.from("products").select("*").eq("company_id", profile.company_id),
      supabase.from("suppliers").select("*").eq("company_id", profile.company_id),
    ]).then(([h, p, s]) => {
      // Filter price history to only products belonging to this company
      const companyProductIds = new Set((p.data || []).map((pr: any) => pr.id));
      setPriceHistory((h.data || []).filter((ph: any) => companyProductIds.has(ph.product_id)));
      setProducts(p.data || []);
      setSuppliers(s.data || []);
      setLoading(false);
    });
  }, [profile?.company_id]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedHistory = priceHistory
    .filter((h) => h.product_id === selectedProductId)
    .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());

  const chartData = selectedHistory.map((h, i) => ({
    date: new Date(h.changed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    cost: h.new_cost / 100,
  }));
  if (selectedHistory.length > 0) {
    chartData.unshift({ date: "Original", cost: selectedHistory[0].old_cost / 100 });
  }

  const totalIncreases = priceHistory.filter((h) => h.new_cost > h.old_cost).length;
  const totalDecreases = priceHistory.filter((h) => h.new_cost < h.old_cost).length;
  const marginRiskProducts = priceHistory.filter((h) => {
    const p = products.find((pr) => pr.id === h.product_id);
    if (!p) return false;
    const newMargin = ((p.selling_price - h.new_cost) / p.selling_price) * 100;
    return newMargin < 10;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Price Change Center" subtitle="Track supplier cost changes, margin impact, and pricing intelligence" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="zentra-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Total Changes</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{priceHistory.length}</p>
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

      {priceHistory.length === 0 ? (
        <div className="zentra-card p-12 text-center text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p>No price changes recorded yet</p>
          <p className="text-sm mt-1">Price changes are tracked automatically when product cost prices are updated</p>
        </div>
      ) : (
        <div className="space-y-3">
          {priceHistory.map((change) => {
            const product = products.find((p) => p.id === change.product_id);
            const supplier = suppliers.find((s) => s.id === change.supplier_id);
            const pctChange = ((change.new_cost - change.old_cost) / change.old_cost * 100).toFixed(1);
            const isIncrease = change.new_cost > change.old_cost;
            const newMargin = product ? ((product.selling_price - change.new_cost) / product.selling_price * 100) : 0;
            const marginRisk = newMargin < 10;
            const suggestedPrice = product ? Math.ceil((change.new_cost / 0.7)) : 0;

            return (
              <div key={change.id} className={`zentra-card p-5 transition-all ${marginRisk ? "border-destructive/30 bg-destructive/[0.02]" : isIncrease ? "border-warning/30 bg-warning/[0.02]" : "border-success/30 bg-success/[0.02]"}`}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${marginRisk ? "bg-destructive/10" : isIncrease ? "bg-warning/10" : "bg-success/10"}`}>
                    {isIncrease ? <TrendingUp className={`h-5 w-5 ${marginRisk ? "text-destructive" : "text-warning"}`} /> : <TrendingDown className="h-5 w-5 text-success" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">{product?.name || "Unknown Product"}</p>
                      {marginRisk && <StatusBadge status="critical" />}
                      {isIncrease && !marginRisk && <StatusBadge status="warning" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Supplier: {supplier?.name || "Unknown"} • {new Date(change.changed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-sm text-muted-foreground line-through">{formatMoney(change.old_cost, currency)}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-bold text-foreground">{formatMoney(change.new_cost, currency)}</span>
                      </div>
                      <p className={`text-xs font-medium ${isIncrease ? "text-destructive" : "text-success"}`}>
                        {isIncrease ? "+" : ""}{pctChange}% • Margin: {newMargin.toFixed(1)}%
                      </p>
                    </div>
                    {marginRisk && product && (
                      <div className="border-l pl-4 text-right">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Suggested Price</p>
                        <p className="text-sm font-bold text-accent">{formatMoney(suggestedPrice, currency)}</p>
                      </div>
                    )}
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSelectedProductId(change.product_id)}>
                      <BarChart3 className="h-3.5 w-3.5" /> History
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedProductId} onOpenChange={() => setSelectedProductId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-accent" />
              {selectedProduct?.name || "Product"} — Price History
            </DialogTitle>
          </DialogHeader>
          {chartData.length > 0 && (
            <div className="py-4">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(215, 15%, 50%)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 15%, 50%)" tickFormatter={(v) => formatMoney(v * 100, currency)} />
                  <Tooltip formatter={(v: number) => [formatMoney(v * 100, currency), "Cost"]} />
                  <Line type="monotone" dataKey="cost" stroke="hsl(170, 60%, 40%)" strokeWidth={2} dot={{ r: 5, fill: "hsl(170, 60%, 40%)" }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Change Log</h4>
                {selectedHistory.map((h) => {
                  const sup = suppliers.find((s) => s.id === h.supplier_id);
                  const isUp = h.new_cost > h.old_cost;
                  return (
                    <div key={h.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">{new Date(h.changed_at).toLocaleDateString("en-GB")}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{formatMoney(h.old_cost, currency)}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className={`font-medium ${isUp ? "text-destructive" : "text-success"}`}>{formatMoney(h.new_cost, currency)}</span>
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
