import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { formatMoney } from "@/lib/currency";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ScanBarcode, ShoppingCart, Plus, Minus, X, CreditCard, Banknote,
  Search, Package, Trash2, CheckCircle2, Printer, RotateCcw, Star, LockKeyhole,
} from "lucide-react";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { ScannerStatus } from "@/components/ScannerStatus";
import { TerminalStatus } from "@/components/pos/TerminalStatus";
import { PosReceipt } from "@/components/pos/PosReceipt";
import { PrinterStatusIndicator } from "@/components/PrinterStatusIndicator";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { useTerminal } from "@/hooks/use-terminal";
import { openCashDrawer } from "@/lib/printer-service";
import {
  cacheProducts, getCachedProductByBarcode, getCachedProducts,
  queueOfflineSale, queueDrawerEvent, getOfflineStatus,
} from "@/lib/offline-store";
import type { Currency } from "@/lib/types";

export interface CartItem {
  product_id: string;
  name: string;
  barcode: string | null;
  unit_price: number;
  qty: number;
  stock_qty: number;
  line_total: number;
}

export interface SaleRecord {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payments: { method: string; amount: number }[];
  change_given: number;
  cashier_name: string;
  created_at: string;
  company_name: string;
  company_logo?: string | null;
  currency: Currency;
}

export default function Cashier() {
  const { user, profile, company, role } = useAuth();
  const { activeStoreId } = useStore();
  const currency = (company?.currency || "GBP") as Currency;
  const isRestaurant = company?.business_type === "restaurant";

  const [cart, setCart] = useState<CartItem[]>([]);
  const [scanValue, setScanValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [completedSale, setCompletedSale] = useState<SaleRecord | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [posSettings, setPosSettings] = useState<{ auto_open_drawer: boolean }>({ auto_open_drawer: true });
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const terminal = useTerminal();

  const subtotal = cart.reduce((s, i) => s + i.line_total, 0);
  const discount = 0;
  const tax = 0;
  const grandTotal = subtotal - discount + tax;

  useEffect(() => { scanRef.current?.focus(); }, [cart]);

  // Load POS settings
  useEffect(() => {
    if (!profile?.company_id) return;
    supabase.from("pos_settings").select("auto_open_drawer").eq("company_id", profile.company_id).maybeSingle()
      .then(({ data }) => {
        if (data) setPosSettings({ auto_open_drawer: data.auto_open_drawer });
      });
  }, [profile?.company_id]);

  // Load all products for restaurant grid + cache for offline
  useEffect(() => {
    if (!profile?.company_id) return;
    const loadProducts = async () => {
      let q = supabase.from("products")
        .select("id, name, barcode, selling_price, stock_qty, category, sku")
        .eq("company_id", profile.company_id!);
      if (activeStoreId) q = q.eq("store_id", activeStoreId);
      const { data } = await q.limit(500);
      if (data) {
        setAllProducts(data);
        // Cache for offline use
        cacheProducts(data).catch(() => {});
      }
    };
    loadProducts();
  }, [profile?.company_id, activeStoreId]);

  // Load best sellers on mount
  useEffect(() => {
    if (!profile?.company_id) return;
    const loadBestSellers = async () => {
      const { data: saleItems } = await supabase
        .from("sale_items")
        .select("product_id, product_name, qty, sale_id, sales!inner(company_id)")
        .eq("sales.company_id", profile.company_id!);
      if (!saleItems || saleItems.length === 0) return;

      const totals = new Map<string, { id: string; name: string; totalQty: number }>();
      saleItems.forEach((si: any) => {
        if (!si.product_id) return;
        const existing = totals.get(si.product_id);
        if (existing) { existing.totalQty += si.qty; }
        else { totals.set(si.product_id, { id: si.product_id, name: si.product_name, totalQty: si.qty }); }
      });

      const topIds = [...totals.values()].sort((a, b) => b.totalQty - a.totalQty).slice(0, 12);
      if (topIds.length === 0) return;

      const { data: prods } = await supabase
        .from("products")
        .select("id, name, barcode, selling_price, stock_qty, sku")
        .in("id", topIds.map((t) => t.id));
      if (!prods) return;

      const prodMap = new Map(prods.map((p) => [p.id, p]));
      const sorted = topIds.map((t) => prodMap.get(t.id)).filter(Boolean);
      setBestSellers(sorted);
    };
    loadBestSellers();
  }, [profile?.company_id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F2" && cart.length > 0 && !showPayment && !completedSale) {
        e.preventDefault();
        setShowPayment(true);
      }
      if (e.key === "Escape") { setShowPayment(false); setShowReceipt(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cart, showPayment, completedSale]);

  useEffect(() => {
    if (!profile?.company_id || searchQuery.length < 1) { setProducts([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      // Try online first, fallback to cached
      if (navigator.onLine) {
        let q = supabase
          .from("products")
          .select("id, name, barcode, selling_price, stock_qty, category, sku")
          .eq("company_id", profile.company_id!)
          .or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%,barcode.ilike.%${searchQuery}%`)
          .limit(20);
        if (activeStoreId) q = q.eq("store_id", activeStoreId);
        const { data } = await q;
        setProducts(data || []);
      } else {
        // Offline: search from cached products
        const cached = await getCachedProducts(profile.company_id!);
        const q = searchQuery.toLowerCase();
        const filtered = cached.filter(p =>
          p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.includes(searchQuery)
        ).slice(0, 20);
        setProducts(filtered);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, profile?.company_id, activeStoreId]);

  const addToCart = useCallback((product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id
            ? { ...i, qty: i.qty + 1, line_total: (i.qty + 1) * i.unit_price }
            : i
        );
      }
      return [...prev, {
        product_id: product.id, name: product.name, barcode: product.barcode,
        unit_price: product.selling_price, qty: 1, stock_qty: product.stock_qty,
        line_total: product.selling_price,
      }];
    });
    toast.success(`${product.name} added`, { duration: 1000 });
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const product = (e as CustomEvent).detail;
      if (product) addToCart(product);
    };
    window.addEventListener("global-barcode-scan", handler);
    return () => window.removeEventListener("global-barcode-scan", handler);
  }, [addToCart]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanValue.trim() || !profile?.company_id) return;

    // Try online first, then offline cache
    if (navigator.onLine) {
      let q = supabase
        .from("products")
        .select("id, name, barcode, selling_price, stock_qty")
        .eq("company_id", profile.company_id)
        .eq("barcode", scanValue.trim());
      if (activeStoreId) q = q.eq("store_id", activeStoreId);
      const { data } = await q.maybeSingle();
      if (data) { addToCart(data); }
      else { toast.error("Barcode not found", { description: `No product matches "${scanValue}"` }); }
    } else {
      const cached = await getCachedProductByBarcode(scanValue.trim(), profile.company_id);
      if (cached) { addToCart(cached); }
      else { toast.error("Barcode not found offline"); }
    }
    setScanValue("");
    scanRef.current?.focus();
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.product_id !== productId) return i;
        const newQty = Math.max(0, i.qty + delta);
        return { ...i, qty: newQty, line_total: newQty * i.unit_price };
      }).filter((i) => i.qty > 0)
    );
  };

  const removeItem = (productId: string) => setCart((prev) => prev.filter((i) => i.product_id !== productId));
  const clearCart = () => setCart([]);
  const stockErrors = isRestaurant ? [] : cart.filter((i) => i.qty > i.stock_qty);

  // Trigger cash drawer + log event
  const triggerCashDrawer = async (triggerType: "cash_payment" | "manual", saleId?: string) => {
    if (!profile?.company_id || !user) return;

    // Open drawer
    await openCashDrawer();

    // Log event (online or queue for offline)
    const eventData = {
      company_id: profile.company_id,
      store_id: activeStoreId || null,
      user_id: user.id,
      user_name: profile.full_name,
      trigger_type: triggerType,
      sale_id: saleId || null,
    };

    if (navigator.onLine) {
      await supabase.from("drawer_events").insert(eventData);
    } else {
      await queueDrawerEvent({
        id: crypto.randomUUID(),
        data: eventData,
        created_at: new Date().toISOString(),
        synced: false,
      });
    }
  };

  const handlePaymentComplete = async (payments: { method: string; amount: number }[], customerName?: string) => {
    if (!profile?.company_id || !user) return;
    setProcessing(true);

    try {
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
      const changeGiven = Math.max(0, totalPaid - grandTotal);
      const isPayLater = payments.length === 0;
      const hasCashPayment = payments.some(p => p.method === "cash");

      // Check if offline
      if (!navigator.onLine) {
        // Queue for offline sync
        const offlineSaleId = crypto.randomUUID();
        await queueOfflineSale({
          id: offlineSaleId,
          data: {
            company_id: profile.company_id,
            cashier_id: user.id,
            cashier_name: profile.full_name,
            subtotal, discount, tax, total: grandTotal,
            change_given: changeGiven,
            status: isPayLater ? "pending" : "completed",
            store_id: activeStoreId,
            items: cart.map(i => ({
              product_id: i.product_id, product_name: i.name,
              qty: i.qty, unit_price: i.unit_price, line_total: i.line_total,
            })),
            payments,
            customer_name: customerName,
          },
          created_at: new Date().toISOString(),
          synced: false,
        });

        // Open cash drawer for cash payments
        if (hasCashPayment && posSettings.auto_open_drawer) {
          await triggerCashDrawer("cash_payment", offlineSaleId);
        }

        setCompletedSale({
          id: offlineSaleId, items: [...cart], subtotal, discount, tax, total: grandTotal,
          payments, change_given: changeGiven, cashier_name: profile.full_name,
          created_at: new Date().toISOString(), company_name: company?.name || "", currency,
          company_logo: company?.logo_url,
        });
        setShowPayment(false);
        setCart([]);
        toast.success("Sale saved offline — will sync when online");
        setProcessing(false);
        return;
      }

      // 1. Create sale
      const { data: sale, error: saleErr } = await supabase
        .from("sales")
        .insert({
          company_id: profile.company_id, cashier_id: user.id, cashier_name: profile.full_name,
          subtotal, discount, tax, total: grandTotal, change_given: changeGiven,
          status: isPayLater ? "pending" : "completed",
          store_id: activeStoreId,
        })
        .select("id").single();
      if (saleErr || !sale) throw saleErr || new Error("Failed to create sale");

      // 2. Insert sale items
      await supabase.from("sale_items").insert(
        cart.map((i) => ({
          sale_id: sale.id, product_id: i.product_id, product_name: i.name,
          qty: i.qty, unit_price: i.unit_price, line_total: i.line_total,
        }))
      );

      // 3. Insert payments (if any)
      if (payments.length > 0) {
        await supabase.from("sale_payments").insert(
          payments.map((p) => ({
            sale_id: sale.id, method: p.method, amount: p.amount,
            provider: p.method === "card" ? "mock" : null,
            reference: p.method === "card" ? `MOCK-${Date.now()}` : null,
          }))
        );
      }

      // 4. Deduct stock (skip for restaurant if no stock tracking)
      for (const item of cart) {
        const { data: currentProduct } = await supabase
          .from("products").select("stock_qty").eq("id", item.product_id).single();
        const currentStock = currentProduct?.stock_qty ?? item.stock_qty;
        await supabase.from("products")
          .update({ stock_qty: Math.max(0, currentStock - item.qty) })
          .eq("id", item.product_id);
        await supabase.from("inventory_movements").insert({
          company_id: profile.company_id, product_id: item.product_id,
          product_name: item.name, type: "SALE" as const, qty: -item.qty,
          user_id: user.id, user_name: profile.full_name,
          note: `POS Sale #${sale.id.slice(0, 8)}${isPayLater ? " (Pay Later)" : ""}`,
          store_id: activeStoreId,
        });
      }

      // 5. If Pay Later → create customer, invoice, ledger CHARGE
      if (isPayLater && customerName) {
        let customerId: string | null = null;
        const { data: existingCustomers } = await supabase
          .from("customers").select("id").eq("company_id", profile.company_id)
          .ilike("name", customerName).limit(1);

        if (existingCustomers && existingCustomers.length > 0) {
          customerId = existingCustomers[0].id;
        } else {
          const { data: newCust } = await supabase
            .from("customers").insert({ company_id: profile.company_id, name: customerName, outstanding_balance: 0 })
            .select("id").single();
          customerId = newCust?.id || null;
        }

        if (customerId) {
          const invNum = `INV-${Date.now().toString(36).toUpperCase()}`;
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 7);

          const { data: inv } = await supabase.from("invoices").insert({
            company_id: profile.company_id, customer_id: customerId, invoice_number: invNum,
            due_date: dueDate.toISOString().split("T")[0], subtotal: grandTotal, total: grandTotal,
            status: "sent" as any, store_id: activeStoreId,
          }).select("id").single();

          if (inv) {
            await supabase.from("invoice_items").insert(
              cart.map((i) => ({
                invoice_id: inv.id, product_id: i.product_id, product_name: i.name,
                qty: i.qty, unit_price: i.unit_price, total: i.line_total,
              }))
            );
          }

          const itemDesc = cart.map(i => `${i.name} x${i.qty}`).join(", ");
          await supabase.from("customer_ledger").insert({
            customer_id: customerId, company_id: profile.company_id, store_id: activeStoreId,
            type: "CHARGE" as any, amount: grandTotal, description: `POS Sale: ${itemDesc}`,
            reference_id: sale.id, due_date: dueDate.toISOString().split("T")[0],
          });

          const { data: custData } = await supabase
            .from("customers").select("outstanding_balance").eq("id", customerId).single();
          await supabase.from("customers").update({
            outstanding_balance: (custData?.outstanding_balance || 0) + grandTotal,
          }).eq("id", customerId);
        }
      }

      // 6. Open cash drawer if cash payment
      if (hasCashPayment && posSettings.auto_open_drawer) {
        await triggerCashDrawer("cash_payment", sale.id);
      }

      // 7. Build completed sale record
      setCompletedSale({
        id: sale.id, items: [...cart], subtotal, discount, tax, total: grandTotal,
        payments, change_given: changeGiven, cashier_name: profile.full_name,
        created_at: new Date().toISOString(), company_name: company?.name || "", currency,
        company_logo: company?.logo_url,
      });

      setShowPayment(false);
      setCart([]);
      toast.success(isPayLater ? "Sale recorded — added to credit ledger" : "Payment successful!");
    } catch (err: any) {
      toast.error("Payment failed", { description: err?.message });
    } finally {
      setProcessing(false);
    }
  };

  const startNewSale = () => {
    setCompletedSale(null); setShowReceipt(false); setCart([]); setScanValue("");
    scanRef.current?.focus();
  };

  // Get categories for restaurant grid
  const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
  const filteredGridProducts = categoryFilter
    ? allProducts.filter(p => p.category === categoryFilter)
    : allProducts;

  // SUCCESS SCREEN
  if (completedSale && !showReceipt) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="p-8 max-w-md w-full text-center space-y-6">
          <div className="mx-auto h-20 w-20 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <h2 className="text-2xl font-display font-bold">
            {completedSale.payments.length === 0 ? "Sale Recorded" : "Payment Successful"}
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{formatMoney(completedSale.total, currency)}</span>
            </div>
            {completedSale.payments.map((p, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-muted-foreground capitalize">{p.method}</span>
                <span>{formatMoney(p.amount, currency)}</span>
              </div>
            ))}
            {completedSale.payments.length === 0 && (
              <div className="flex justify-between text-warning font-semibold">
                <span>Status</span>
                <span>Pay Later — Added to Credit Ledger</span>
              </div>
            )}
            {completedSale.change_given > 0 && (
              <div className="flex justify-between text-success font-semibold">
                <span>Change</span>
                <span>{formatMoney(completedSale.change_given, currency)}</span>
              </div>
            )}
          </div>
          <Separator />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowReceipt(true)}>
              <Printer className="h-4 w-4 mr-2" /> Print Receipt
            </Button>
            <Button className="flex-1" onClick={startNewSale}>
              <RotateCcw className="h-4 w-4 mr-2" /> New Sale
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (showReceipt && completedSale) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowReceipt(false)}>← Back</Button>
          <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print</Button>
          <Button variant="secondary" onClick={startNewSale}>
            <RotateCcw className="h-4 w-4 mr-2" /> New Sale
          </Button>
        </div>
        <PosReceipt sale={completedSale} />
      </div>
    );
  }

  // MAIN POS LAYOUT
  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-5rem)]">
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ScanBarcode className="h-4 w-4" /> Barcode Scanner
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <OfflineIndicator />
              <PrinterStatusIndicator />
              <ScannerStatus />
              <TerminalStatus
                status={terminal.status}
                readerLabel={terminal.reader?.label}
                error={terminal.error}
                onConnect={terminal.connect}
                onDisconnect={terminal.disconnect}
              />
            </div>
          </div>
          <form onSubmit={handleScan} className="flex gap-3">
            <div className="relative flex-1">
              <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input ref={scanRef} value={scanValue} onChange={(e) => setScanValue(e.target.value)}
                placeholder="Scan barcode or type code…" className="pl-11 h-12 text-lg font-mono" autoFocus />
            </div>
            <Button type="submit" size="lg" className="h-12 px-6">Scan</Button>
          </form>
          {/* Admin manual drawer open */}
          {(role === "owner" || role === "manager") && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5"
              onClick={() => triggerCashDrawer("manual")}>
              <LockKeyhole className="h-3 w-3" /> Open Drawer
            </Button>
          )}
        </Card>

        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* Restaurant mode: category tabs + grid */}
          {isRestaurant && categories.length > 0 && (
            <div className="p-3 border-b flex gap-2 flex-wrap">
              <Badge variant={!categoryFilter ? "default" : "secondary"}
                className="cursor-pointer" onClick={() => setCategoryFilter(null)}>All</Badge>
              {categories.map(cat => (
                <Badge key={cat} variant={categoryFilter === cat ? "default" : "secondary"}
                  className="cursor-pointer" onClick={() => setCategoryFilter(cat)}>{cat}</Badge>
              ))}
            </div>
          )}

          {isRestaurant ? (
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
                {filteredGridProducts.map((p) => (
                  <button key={p.id} onClick={() => addToCart(p)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-transparent hover:border-primary/40 hover:bg-primary/5 transition-all text-center group bg-card shadow-sm">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-16 w-16 rounded-xl object-cover" />
                    ) : (
                      <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    )}
                    <p className="font-medium text-sm leading-tight line-clamp-2">{p.name}</p>
                    <p className="text-sm font-bold text-primary">{formatMoney(p.selling_price, currency)}</p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <>
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products by name, SKU, or barcode…" className="pl-10" />
                </div>
              </div>
              <ScrollArea className="flex-1">
                {products.length === 0 && searchQuery.length > 0 && !searching && (
                  <div className="p-8 text-center text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>No products found</p>
                  </div>
                )}
                {products.length === 0 && searchQuery.length === 0 && bestSellers.length > 0 && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Star className="h-4 w-4" /> Best Sellers — Quick Add
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                      {bestSellers.map((p) => (
                        <button key={p.id} onClick={() => addToCart(p)}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-dashed border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-colors text-center group">
                          <Package className="h-5 w-5 text-primary/60 group-hover:text-primary transition-colors" />
                          <p className="font-medium text-xs leading-tight truncate w-full">{p.name}</p>
                          <p className="text-xs font-semibold text-primary">{formatMoney(p.selling_price, currency)}</p>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">Click any product to add to cart instantly</p>
                  </div>
                )}
                {products.length === 0 && searchQuery.length === 0 && bestSellers.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <ScanBarcode className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">Ready to scan</p>
                    <p className="text-sm mt-1">Scan a barcode or search for products above</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 p-4">
                  {products.map((p) => (
                    <button key={p.id} onClick={() => addToCart(p)}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/10 hover:border-accent transition-colors text-left">
                      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.sku}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-sm">{formatMoney(p.selling_price, currency)}</p>
                        <p className="text-xs text-muted-foreground">{p.stock_qty} in stock</p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </Card>
      </div>

      <Card className="w-full lg:w-[400px] xl:w-[440px] flex flex-col shrink-0">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-accent" />
            <h2 className="font-display font-semibold text-lg">Cart</h2>
            {cart.length > 0 && <Badge variant="secondary" className="ml-1">{cart.length}</Badge>}
          </div>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          {cart.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>Cart is empty</p><p className="text-xs mt-1">Scan items to add them</p>
            </div>
          ) : (
            <div className="divide-y">
              {cart.map((item) => (
                <div key={item.product_id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatMoney(item.unit_price, currency)} each</p>
                    </div>
                    <button onClick={() => removeItem(item.product_id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product_id, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-semibold text-sm">{item.qty}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product_id, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      {!isRestaurant && item.qty > item.stock_qty && (
                        <span className="text-[10px] text-destructive font-medium ml-1">Only {item.stock_qty}!</span>
                      )}
                    </div>
                    <span className="font-semibold text-sm">{formatMoney(item.line_total, currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-4 space-y-3">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(subtotal, currency)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatMoney(grandTotal, currency)}</span>
            </div>
          </div>

          {stockErrors.length > 0 && (
            <p className="text-xs text-destructive text-center">
              {stockErrors.length} item(s) exceed stock — adjust quantities
            </p>
          )}

          <Button className="w-full h-14 text-lg font-bold gap-2"
            disabled={cart.length === 0 || stockErrors.length > 0}
            onClick={() => setShowPayment(true)}>
            <Banknote className="h-5 w-5" /> Pay {grandTotal > 0 ? formatMoney(grandTotal, currency) : ""}
          </Button>
          <p className="text-xs text-center text-muted-foreground">Press F2 for quick pay</p>
        </div>
      </Card>

      {showPayment && (
        <PaymentModal
          total={grandTotal} currency={currency}
          onClose={() => setShowPayment(false)}
          onComplete={handlePaymentComplete}
          processing={processing}
          terminalStatus={terminal.status}
          onTerminalPayment={(amount) => terminal.collectPayment(amount, currency.toLowerCase())}
          isTerminalCollecting={terminal.isCollecting}
          onCancelTerminalCollect={terminal.cancelCollect}
          onRetryTerminal={terminal.connect}
        />
      )}
    </div>
  );
}
