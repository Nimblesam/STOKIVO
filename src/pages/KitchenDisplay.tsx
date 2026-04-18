import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Clock, CheckCircle2, Utensils } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface KitchenItem { id: string; product_name: string; qty: number; notes: string | null; }
interface KitchenOrder {
  id: string;
  order_number: string;
  status: "pending" | "preparing" | "ready" | "served" | "cancelled";
  cashier_name: string | null;
  notes: string | null;
  created_at: string;
  ready_at: string | null;
  items: KitchenItem[];
}

const STATUSES: Array<{ key: "pending" | "preparing" | "ready"; label: string; color: string; icon: any }> = [
  { key: "pending", label: "Pending", color: "border-l-warning", icon: Clock },
  { key: "preparing", label: "Preparing", color: "border-l-primary", icon: ChefHat },
  { key: "ready", label: "Ready", color: "border-l-success", icon: CheckCircle2 },
];

export default function KitchenDisplay() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.company_id) return;

    const fetchOrders = async () => {
      const { data: ordersData } = await supabase
        .from("kitchen_orders")
        .select("id, order_number, status, cashier_name, notes, created_at, ready_at")
        .eq("company_id", profile.company_id)
        .in("status", ["pending", "preparing", "ready"])
        .order("created_at", { ascending: true });

      if (!ordersData) { setLoading(false); return; }

      const ids = ordersData.map((o) => o.id);
      const { data: itemsData } = ids.length
        ? await supabase
            .from("kitchen_order_items")
            .select("id, order_id, product_name, qty, notes")
            .in("order_id", ids)
        : { data: [] as any[] };

      const grouped = ordersData.map((o) => ({
        ...o,
        status: o.status as KitchenOrder["status"],
        items: (itemsData || []).filter((i: any) => i.order_id === o.id),
      })) as KitchenOrder[];

      setOrders(grouped);
      setLoading(false);
    };

    fetchOrders();

    const channel = supabase
      .channel("kitchen-orders-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "kitchen_orders", filter: `company_id=eq.${profile.company_id}` }, () => fetchOrders())
      .on("postgres_changes", { event: "*", schema: "public", table: "kitchen_order_items" }, () => fetchOrders())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.company_id]);

  const updateStatus = async (id: string, status: KitchenOrder["status"]) => {
    const update: any = { status };
    if (status === "ready") update.ready_at = new Date().toISOString();
    if (status === "served") update.served_at = new Date().toISOString();
    const { error } = await supabase.from("kitchen_orders").update(update).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(`Order marked ${status}`);
  };

  if (!profile?.company_id) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">No company assigned</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Utensils className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-foreground">Kitchen Display</h1>
              <p className="text-sm text-muted-foreground">Live orders · {orders.length} active</p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STATUSES.map((col) => {
              const Icon = col.icon;
              const list = orders.filter((o) => o.status === col.key);
              return (
                <div key={col.key} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Icon className="h-4 w-4 text-foreground" />
                    <h2 className="font-display font-semibold text-foreground">{col.label}</h2>
                    <Badge variant="secondary">{list.length}</Badge>
                  </div>
                  <div className="space-y-3 min-h-[200px]">
                    {list.length === 0 && (
                      <Card className="p-6 text-center text-xs text-muted-foreground border-dashed">
                        No orders
                      </Card>
                    )}
                    {list.map((order) => (
                      <Card key={order.id} className={`border-l-4 ${col.color} p-4 space-y-3`}>
                        <div className="flex items-center justify-between">
                          <span className="font-display font-bold text-foreground">{order.order_number}</span>
                          <span className="text-xs text-muted-foreground">{format(new Date(order.created_at), "HH:mm")}</span>
                        </div>
                        <ul className="space-y-1 text-sm">
                          {order.items.map((it) => (
                            <li key={it.id} className="flex justify-between">
                              <span className="text-foreground">{it.product_name}</span>
                              <span className="font-semibold text-foreground">×{it.qty}</span>
                            </li>
                          ))}
                        </ul>
                        {order.cashier_name && (
                          <p className="text-[10px] text-muted-foreground">Cashier: {order.cashier_name}</p>
                        )}
                        <div className="flex gap-2 pt-1">
                          {col.key === "pending" && (
                            <Button size="sm" className="flex-1" onClick={() => updateStatus(order.id, "preparing")}>
                              Start
                            </Button>
                          )}
                          {col.key === "preparing" && (
                            <Button size="sm" className="flex-1" onClick={() => updateStatus(order.id, "ready")}>
                              Mark Ready
                            </Button>
                          )}
                          {col.key === "ready" && (
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => updateStatus(order.id, "served")}>
                              Served
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
