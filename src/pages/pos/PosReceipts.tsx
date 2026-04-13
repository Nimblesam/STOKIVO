import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { formatMoney } from "@/lib/currency";
import { PosReceipt } from "@/components/pos/PosReceipt";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, Receipt, Clock, Printer, ArrowLeft } from "lucide-react";
import type { Currency } from "@/lib/types";
import type { SaleRecord } from "@/pages/Cashier";

export default function PosReceipts() {
  const { profile, company } = useAuth();
  const { activeStore } = useStore();
  const currency = (company?.currency || "USD") as Currency;
  const [sales, setSales] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);

  useEffect(() => {
    if (!profile?.company_id) return;
    const fetchSales = async () => {
      setLoading(true);
      let query = supabase
        .from("sales")
        .select("id, created_at, total, subtotal, discount, tax, change_given, cashier_name, status")
        .eq("company_id", profile.company_id!)
        .order("created_at", { ascending: false })
        .limit(50);

      if (activeStore) query = query.eq("store_id", activeStore.id);

      const { data } = await query;
      setSales(data || []);
      setLoading(false);
    };
    fetchSales();
  }, [profile?.company_id, activeStore]);

  const filtered = search
    ? sales.filter(
        (s) =>
          s.id.toLowerCase().includes(search.toLowerCase()) ||
          s.cashier_name.toLowerCase().includes(search.toLowerCase())
      )
    : sales;

  const handleViewReceipt = async (sale: any) => {
    // Fetch sale items and payments
    const [{ data: items }, { data: payments }] = await Promise.all([
      supabase.from("sale_items").select("product_id, product_name, qty, unit_price, line_total").eq("sale_id", sale.id),
      supabase.from("sale_payments").select("method, amount").eq("sale_id", sale.id),
    ]);

    setSelectedSale({
      id: sale.id,
      items: (items || []).map((i: any) => ({
        product_id: i.product_id || "",
        name: i.product_name,
        barcode: null,
        unit_price: i.unit_price,
        qty: i.qty,
        stock_qty: 0,
        line_total: i.line_total,
      })),
      subtotal: sale.subtotal,
      discount: sale.discount,
      tax: sale.tax,
      total: sale.total,
      payments: (payments || []).map((p: any) => ({ method: p.method, amount: p.amount })),
      change_given: sale.change_given,
      cashier_name: sale.cashier_name,
      created_at: sale.created_at,
      company_name: company?.name || "",
      company_logo: company?.logo_url,
      currency,
    });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Recent Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">View and reprint receipts from recent sales.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by Sale ID or cashier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No sales found</p>
          ) : (
            filtered.map((sale) => (
              <Card key={sale.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleViewReceipt(sale)}>
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Receipt className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">#{sale.id.slice(0, 8)}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(sale.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={sale.status === "refund" ? "destructive" : "secondary"} className="text-xs">
                      {sale.status}
                    </Badge>
                    <span className="font-semibold text-foreground">{formatMoney(sale.total, currency)}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Reprint receipt" onClick={(e) => { e.stopPropagation(); handleViewReceipt(sale); }}>
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Receipt Preview Dialog */}
      <Dialog open={!!selectedSale} onOpenChange={(open) => { if (!open) setSelectedSale(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selectedSale && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedSale(null)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button size="sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-1" /> Print
                </Button>
              </div>
              <PosReceipt sale={selectedSale} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
