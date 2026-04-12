import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatMoney } from "@/lib/currency";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Search, RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Currency } from "@/lib/types";

interface SaleItem {
  id: string;
  product_id: string | null;
  product_name: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

interface SaleData {
  id: string;
  created_at: string;
  total: number;
  cashier_name: string;
  status: string;
  items: SaleItem[];
}

export default function PosRefunds() {
  const { profile, company } = useAuth();
  const currency = (company?.currency || "USD") as Currency;
  const [searchId, setSearchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [sale, setSale] = useState<SaleData | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [refundComplete, setRefundComplete] = useState(false);

  const searchSale = async () => {
    if (!searchId.trim()) return;
    setLoading(true);
    setSale(null);
    setSelectedItems({});
    setRefundComplete(false);

    const { data, error } = await supabase
      .from("sales")
      .select("id, created_at, total, cashier_name, status")
      .or(`id.eq.${searchId.trim()}`)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      toast.error("Sale not found");
      setLoading(false);
      return;
    }

    const { data: items } = await supabase
      .from("sale_items")
      .select("*")
      .eq("sale_id", data.id);

    setSale({ ...data, items: items || [] });
    setLoading(false);
  };

  const toggleItem = (itemId: string, qty: number) => {
    setSelectedItems((prev) => {
      if (prev[itemId]) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: qty };
    });
  };

  const updateRefundQty = (itemId: string, qty: number) => {
    setSelectedItems((prev) => ({ ...prev, [itemId]: Math.max(1, qty) }));
  };

  const refundTotal = sale
    ? sale.items
        .filter((i) => selectedItems[i.id])
        .reduce((sum, i) => sum + i.unit_price * (selectedItems[i.id] || 0), 0)
    : 0;

  const processRefund = async () => {
    if (!sale || !profile?.company_id || Object.keys(selectedItems).length === 0) return;
    setRefunding(true);

    try {
      // Create refund sale record (negative total)
      const { data: refundSale, error: refundErr } = await supabase
        .from("sales")
        .insert({
          company_id: profile.company_id,
          cashier_id: profile.user_id,
          cashier_name: profile.full_name || "Cashier",
          subtotal: -refundTotal,
          total: -refundTotal,
          status: "refund",
          discount: 0,
          tax: 0,
          change_given: 0,
        })
        .select("id")
        .single();

      if (refundErr || !refundSale) throw refundErr;

      // Create refund line items and restore stock
      for (const item of sale.items) {
        const refundQty = selectedItems[item.id];
        if (!refundQty) continue;

        await supabase.from("sale_items").insert({
          sale_id: refundSale.id,
          product_id: item.product_id,
          product_name: item.product_name,
          qty: -refundQty,
          unit_price: item.unit_price,
          line_total: -(item.unit_price * refundQty),
        });

        // Restore stock
        if (item.product_id) {
          const { data: product } = await supabase
            .from("products")
            .select("stock_qty")
            .eq("id", item.product_id)
            .single();

          if (product) {
            await supabase
              .from("products")
              .update({ stock_qty: product.stock_qty + refundQty })
              .eq("id", item.product_id);

            // Log inventory movement
            await supabase.from("inventory_movements").insert({
              company_id: profile.company_id,
              product_id: item.product_id,
              product_name: item.product_name,
              qty: refundQty,
              type: "STOCK_IN" as const,
              note: `Refund from sale ${sale.id.slice(0, 8)}`,
              user_id: profile.user_id,
              user_name: profile.full_name,
            });
          }
        }
      }

      // Record refund payment
      await supabase.from("sale_payments").insert({
        sale_id: refundSale.id,
        method: "refund",
        amount: -refundTotal,
      });

      toast.success("Refund processed successfully");
      setRefundComplete(true);
    } catch (err: any) {
      toast.error("Refund failed: " + (err?.message || "Unknown error"));
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Refunds</h1>
        <p className="text-sm text-muted-foreground mt-1">Search a sale by ID to process a full or partial refund.</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter Sale ID or Receipt Number..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchSale()}
                className="pl-9"
              />
            </div>
            <Button onClick={searchSale} disabled={loading}>
              {loading ? "Searching..." : "Find Sale"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Refund Complete */}
      {refundComplete && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-semibold text-foreground">Refund Processed</p>
              <p className="text-sm text-muted-foreground">
                {formatMoney(refundTotal, currency)} has been refunded and stock restored.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sale details */}
      {sale && !refundComplete && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Sale #{sale.id.slice(0, 8)}</CardTitle>
              <Badge variant={sale.status === "refund" ? "destructive" : "default"}>
                {sale.status}
              </Badge>
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{new Date(sale.created_at).toLocaleString()}</span>
              <span>Cashier: {sale.cashier_name}</span>
              <span>Total: {formatMoney(sale.total, currency)}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {sale.status === "refund" && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4" />
                This sale has already been refunded.
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Select</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Refund Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={!!selectedItems[item.id]}
                        onCheckedChange={() => toggleItem(item.id, item.qty)}
                        disabled={sale.status === "refund"}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell className="text-right">{item.qty}</TableCell>
                    <TableCell className="text-right">{formatMoney(item.unit_price, currency)}</TableCell>
                    <TableCell className="text-right">
                      {selectedItems[item.id] ? (
                        <Input
                          type="number"
                          min={1}
                          max={item.qty}
                          value={selectedItems[item.id]}
                          onChange={(e) => updateRefundQty(item.id, Math.min(item.qty, parseInt(e.target.value) || 1))}
                          className="w-20 ml-auto text-right h-8"
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {Object.keys(selectedItems).length > 0 && sale.status !== "refund" && (
              <div className="space-y-3 pt-2">
                <Textarea
                  placeholder="Reason for refund (optional)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                />
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-foreground">
                    Refund Total: {formatMoney(refundTotal, currency)}
                  </div>
                  <Button
                    onClick={processRefund}
                    disabled={refunding}
                    variant="destructive"
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {refunding ? "Processing..." : "Process Refund"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
