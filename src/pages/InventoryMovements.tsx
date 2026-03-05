import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, RefreshCw, ShoppingCart, Loader2, Package } from "lucide-react";
import { useState, useEffect } from "react";

const typeIcons: Record<string, { icon: typeof ArrowUp; className: string }> = {
  STOCK_IN: { icon: ArrowDown, className: "text-success bg-success/10" },
  STOCK_OUT: { icon: ArrowUp, className: "text-destructive bg-destructive/10" },
  SALE: { icon: ShoppingCart, className: "text-accent bg-accent/10" },
  ADJUSTMENT: { icon: RefreshCw, className: "text-warning bg-warning/10" },
};

export default function InventoryMovements() {
  const { profile } = useAuth();
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.company_id) return;
    setLoading(true);
    supabase
      .from("inventory_movements")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setMovements(data || []);
        setLoading(false);
      });
  }, [profile?.company_id]);

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Stock Movements" subtitle="Audit trail of all inventory changes" />

      <div className="zentra-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : movements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>No stock movements yet</p>
            <p className="text-sm mt-1">Movements are recorded automatically from sales, stock adjustments, and imports</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Note</TableHead>
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
                        <div className={`h-7 w-7 rounded-md flex items-center justify-center ${config.className}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-medium">{m.type.replace("_", " ")}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{m.product_name}</TableCell>
                    <TableCell className={`text-right font-semibold text-sm ${m.qty > 0 ? "text-success" : "text-destructive"}`}>
                      {m.qty > 0 ? "+" : ""}{m.qty}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.user_name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.note || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
