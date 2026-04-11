import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatMoney } from "@/lib/currency";
import {
  ArrowDown, ArrowUp, RefreshCw, ShoppingCart, Loader2, Package,
  AlertTriangle, Clock, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import type { Currency } from "@/lib/types";

const typeIcons: Record<string, { icon: typeof ArrowUp; className: string }> = {
  STOCK_IN: { icon: ArrowDown, className: "text-success bg-success/10" },
  STOCK_OUT: { icon: ArrowUp, className: "text-destructive bg-destructive/10" },
  SALE: { icon: ShoppingCart, className: "text-accent bg-accent/10" },
  ADJUSTMENT: { icon: RefreshCw, className: "text-warning bg-warning/10" },
};

function getDaysUntil(dateStr: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryColor(days: number) {
  if (days < 0) return "text-destructive bg-destructive/10";
  if (days <= 7) return "text-destructive bg-destructive/10";
  if (days <= 30) return "text-warning bg-warning/10";
  if (days <= 90) return "text-accent bg-accent/10";
  return "text-muted-foreground bg-muted/50";
}

function getExpiryLabel(days: number) {
  if (days < 0) return "Expired";
  if (days === 0) return "Expires today";
  if (days <= 7) return `${days}d left`;
  if (days <= 30) return `${days}d left`;
  if (days <= 90) return `${Math.ceil(days / 7)}w left`;
  return `${Math.ceil(days / 30)}m left`;
}

export default function InventoryMovements() {
  const { user, profile, company } = useAuth();
  const { activeStoreId } = useStore();
  const currency = (company?.currency || "GBP") as Currency;
  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.company_id) return;
    const cid = profile.company_id;
    setLoading(true);
    let movQ = supabase.from("inventory_movements").select("*").eq("company_id", cid).order("created_at", { ascending: false }).limit(200);
    let prodQ = supabase.from("products").select("*").eq("company_id", cid);
    let salesQ = supabase.from("sales").select("total, created_at").eq("company_id", cid);
    if (activeStoreId) {
      movQ = movQ.eq("store_id", activeStoreId);
      prodQ = prodQ.eq("store_id", activeStoreId);
      salesQ = salesQ.eq("store_id", activeStoreId);
    }
    Promise.all([movQ, prodQ, salesQ]).then(([m, p, s]) => {
      setMovements(m.data || []);
      setProducts(p.data || []);
      setSales(s.data || []);
      setLoading(false);
    });
  }, [profile?.company_id, activeStoreId]);

  // Expiry alerts
  const expiryProducts = useMemo(() => {
    return products
      .filter((p) => p.expiry_date && p.stock_qty > 0)
      .map((p) => ({ ...p, daysUntil: getDaysUntil(p.expiry_date) }))
      .filter((p) => p.daysUntil <= 90)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [products]);

  // Smart reorder suggestions
  const reorderSuggestions = useMemo(() => {
    // Calculate average daily sales per product from sale movements
    const saleMovements = movements.filter((m) => m.type === "SALE");
    const salesByProduct = new Map<string, { totalQty: number; firstDate: Date; lastDate: Date }>();

    saleMovements.forEach((m) => {
      const existing = salesByProduct.get(m.product_id);
      const date = new Date(m.created_at);
      if (existing) {
        existing.totalQty += Math.abs(m.qty);
        if (date < existing.firstDate) existing.firstDate = date;
        if (date > existing.lastDate) existing.lastDate = date;
      } else {
        salesByProduct.set(m.product_id, { totalQty: Math.abs(m.qty), firstDate: date, lastDate: date });
      }
    });

    return products
      .filter((p) => p.min_stock_level > 0)
      .map((p) => {
        const salesData = salesByProduct.get(p.id);
        const now = new Date();
        let avgDailySales = 0;
        let daysOfData = 1;

        if (salesData) {
          daysOfData = Math.max(1, Math.ceil((now.getTime() - salesData.firstDate.getTime()) / (1000 * 60 * 60 * 24)));
          avgDailySales = salesData.totalQty / daysOfData;
        }

        const leadTimeDays = 3; // default lead time
        const safetyStock = Math.ceil(avgDailySales * 2); // 2 days safety
        const reorderPoint = Math.ceil(avgDailySales * leadTimeDays) + safetyStock;
        const daysUntilStockout = avgDailySales > 0 ? Math.floor(p.stock_qty / avgDailySales) : 999;
        const suggestedQty = Math.max(p.min_stock_level * 2 - p.stock_qty, Math.ceil(avgDailySales * 14)); // 2 weeks supply

        const needsReorder = p.stock_qty <= reorderPoint || p.stock_qty <= p.min_stock_level * 1.5;

        return {
          ...p,
          avgDailySales: Math.round(avgDailySales * 10) / 10,
          daysUntilStockout,
          suggestedQty: Math.max(suggestedQty, 1),
          restockCost: Math.max(suggestedQty, 1) * p.cost_price,
          needsReorder,
          trend: avgDailySales > 0 ? (daysUntilStockout <= 7 ? "critical" : daysUntilStockout <= 14 ? "warning" : "ok") : "stable",
        };
      })
      .filter((p) => p.needsReorder)
      .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
  }, [products, movements]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Stock Movements" subtitle="Audit trail, expiry alerts, and smart reorder suggestions" />

      <Tabs defaultValue="movements" className="space-y-4">
        <TabsList className="w-full sm:w-auto flex flex-wrap">
          <TabsTrigger value="movements" className="flex-1 sm:flex-none gap-1.5 text-xs sm:text-sm">
            <ArrowDown className="h-3.5 w-3.5" /> Movements
          </TabsTrigger>
          <TabsTrigger value="expiry" className="flex-1 sm:flex-none gap-1.5 text-xs sm:text-sm">
            <Clock className="h-3.5 w-3.5" /> Expiry Alerts
            {expiryProducts.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">{expiryProducts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reorder" className="flex-1 sm:flex-none gap-1.5 text-xs sm:text-sm">
            <RefreshCw className="h-3.5 w-3.5" /> Reorder Suggestions
            {reorderSuggestions.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{reorderSuggestions.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Movements Tab */}
        <TabsContent value="movements">
          <div className="stokivo-card overflow-hidden">
            {movements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No stock movements yet</p>
                <p className="text-sm mt-1">Movements are recorded automatically from sales, stock adjustments, and imports</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="hidden sm:table-cell">By</TableHead>
                      <TableHead className="hidden md:table-cell">Note</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m) => {
                      const config = typeIcons[m.type] || typeIcons.ADJUSTMENT;
                      const Icon = config.icon;
                      return (
                        <TableRow key={m.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${config.className}`}>
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs font-medium hidden sm:inline">{m.type.replace("_", " ")}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-sm max-w-[120px] sm:max-w-none truncate">{m.product_name}</TableCell>
                          <TableCell className={`text-right font-semibold text-sm ${m.qty > 0 ? "text-success" : "text-destructive"}`}>
                            {m.qty > 0 ? "+" : ""}{m.qty}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{m.user_name || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{m.note || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(m.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Expiry Alerts Tab */}
        <TabsContent value="expiry">
          <div className="stokivo-card overflow-hidden">
            {expiryProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No expiry alerts</p>
                <p className="text-sm mt-1">Products approaching their expiry date will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="hidden sm:table-cell">Category</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Time Left</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiryProducts.map((p) => {
                      const colorClass = getExpiryColor(p.daysUntil);
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${colorClass}`}>
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-sm">{p.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{p.category || "—"}</TableCell>
                          <TableCell className="text-right font-semibold text-sm">{p.stock_qty}</TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(p.expiry_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${colorClass} border-0`}>
                              {getExpiryLabel(p.daysUntil)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Reorder Suggestions Tab */}
        <TabsContent value="reorder">
          <div className="space-y-4">
            {reorderSuggestions.length === 0 ? (
              <div className="stokivo-card text-center py-12 text-muted-foreground">
                <RefreshCw className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>All stock levels are healthy</p>
                <p className="text-sm mt-1">Reorder suggestions will appear when products are running low</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {reorderSuggestions.map((p) => (
                  <div key={p.id} className="stokivo-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.sku}</p>
                      </div>
                      <Badge
                        variant={p.trend === "critical" ? "destructive" : p.trend === "warning" ? "secondary" : "outline"}
                        className="shrink-0 text-[10px]"
                      >
                        {p.trend === "critical" ? "Urgent" : p.trend === "warning" ? "Soon" : "Monitor"}
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Current Stock</span>
                        <span className={`font-semibold ${p.stock_qty <= p.min_stock_level * 0.5 ? "text-destructive" : "text-warning"}`}>{p.stock_qty} / {p.min_stock_level}</span>
                      </div>
                      <Progress value={Math.min(100, (p.stock_qty / p.min_stock_level) * 100)} className={`h-1.5 ${p.stock_qty <= p.min_stock_level * 0.5 ? "[&>div]:bg-destructive" : "[&>div]:bg-warning"}`} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-muted-foreground">Avg. Daily Sales</p>
                        <p className="font-semibold text-foreground flex items-center gap-1">
                          {p.avgDailySales}
                          {p.avgDailySales > 0 ? <TrendingUp className="h-3 w-3 text-accent" /> : <Minus className="h-3 w-3" />}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-muted-foreground">Stock runs out in</p>
                        <p className={`font-semibold ${p.daysUntilStockout <= 7 ? "text-destructive" : p.daysUntilStockout <= 14 ? "text-warning" : "text-foreground"}`}>
                          {p.daysUntilStockout >= 999 ? "N/A" : `${p.daysUntilStockout} days`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-accent/5 border border-accent/10">
                      <div>
                        <p className="text-xs text-muted-foreground">Recommended qty</p>
                        <p className="text-sm font-bold text-foreground">{p.suggestedQty} units</p>
                        <p className="text-[10px] text-muted-foreground">Est. cost: {formatMoney(p.restockCost, currency)}</p>
                      </div>
                      <Button size="sm" className="rounded-full text-xs h-8 px-4"
                        onClick={() => {
                          // Create a stock-in movement as a reorder
                          if (!profile?.company_id || !user) return;
                          supabase.from("inventory_movements").insert({
                            company_id: profile.company_id,
                            product_id: p.id,
                            product_name: p.name,
                            type: "STOCK_IN" as const,
                            qty: p.suggestedQty,
                            user_id: user.id,
                            user_name: profile?.full_name || "Unknown",
                            note: `Reorder: ${p.suggestedQty} units (Est. cost: ${formatMoney(p.restockCost, currency)})`,
                            store_id: activeStoreId || null,
                          }).then(async ({ error }) => {
                            if (error) { toast.error(error.message); return; }
                            // Update stock qty
                            await supabase.from("products").update({
                              stock_qty: p.stock_qty + p.suggestedQty,
                            }).eq("id", p.id);
                            toast.success(`Reordered ${p.suggestedQty} units of ${p.name}`);
                            // Refresh
                            window.location.reload();
                          });
                        }}>
                        Reorder Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
