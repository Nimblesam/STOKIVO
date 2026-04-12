import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { formatMoney } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Receipt, Clock } from "lucide-react";
import type { Currency } from "@/lib/types";

export default function PosReceipts() {
  const { profile, company } = useAuth();
  const { activeStore } = useStore();
  const currency = (company?.currency || "USD") as Currency;
  const [sales, setSales] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.company_id) return;
    const fetchSales = async () => {
      setLoading(true);
      let query = supabase
        .from("sales")
        .select("id, created_at, total, cashier_name, status")
        .eq("company_id", profile.company_id!)
        .order("created_at", { ascending: false })
        .limit(50);

      if (activeStore) query = query.eq("store_id", activeStore);

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
              <Card key={sale.id} className="cursor-pointer hover:bg-muted/30 transition-colors">
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
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
