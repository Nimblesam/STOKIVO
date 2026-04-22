import { useState, useRef, useEffect, useCallback } from "react";
import { CashierPinScreen } from "@/components/pos/CashierPinScreen";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";

import { formatMoney } from "@/lib/currency";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ScanBarcode, ShoppingCart, Plus, X, CreditCard, Banknote,
  Search, Package, Trash2, CheckCircle2, Printer, RotateCcw, LockKeyhole, MoreHorizontal, UserPlus, Percent, Minus,
} from "lucide-react";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { ScannerStatus } from "@/components/ScannerStatus";
import { TerminalStatus } from "@/components/pos/TerminalStatus";
import { PosReceipt } from "@/components/pos/PosReceipt";
import { PrinterStatusIndicator } from "@/components/PrinterStatusIndicator";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { useTerminal } from "@/hooks/use-terminal";
import { openCashDrawer } from "@/lib/printer-service";
import { sunmiPrint, sunmiOpenDrawer, sunmiStatus } from "@/lib/sunmi-service";
import { buildReceiptText } from "@/lib/sunmi-receipt";
import {
  cacheProducts, getCachedProductByBarcode, getCachedProducts,
  queueOfflineSale, queueDrawerEvent,
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
  image_url?: string | null;
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

  // PIN session: persist active cashier + last activity timestamp per company.
  // Cashier stays signed in until 15 minutes of inactivity (no keydown/click/touch).
  const PIN_IDLE_MS = 15 * 60 * 1000;
  const sessionKey = profile?.company_id ? `stokivo_pos_session_${profile.company_id}` : null;

  const [activeCashier, setActiveCashier] = useState<{ id: string; name: string; role: string } | null>(() => {
    if (typeof window === "undefined" || !profile?.company_id) return null;
    try {
      const raw = localStorage.getItem(`stokivo_pos_session_${profile.company_id}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { cashier: { id: string; name: string; role: string }; lastActivity: number };
      if (!parsed?.cashier || !parsed?.lastActivity) return null;
      if (Date.now() - parsed.lastActivity > PIN_IDLE_MS) {
        localStorage.removeItem(`stokivo_pos_session_${profile.company_id}`);
        return null;
      }
      return parsed.cashier;
    } catch {
      return null;
    }
  });

  // Wrap setter so we always persist + stamp activity, and clear on sign-out.
  const persistCashier = useCallback((c: { id: string; name: string; role: string } | null) => {
    setActiveCashier(c);
    if (!sessionKey) return;
    if (c) {
      localStorage.setItem(sessionKey, JSON.stringify({ cashier: c, lastActivity: Date.now() }));
    } else {
      localStorage.removeItem(sessionKey);
    }
  }, [sessionKey]);

  // Bump activity on user interaction; auto-lock after PIN_IDLE_MS of inactivity.
  useEffect(() => {
    if (!activeCashier || !sessionKey) return;

    const bump = () => {
      try {
        localStorage.setItem(sessionKey, JSON.stringify({ cashier: activeCashier, lastActivity: Date.now() }));
      } catch { /* quota / private mode — ignore */ }
    };

    const events: (keyof WindowEventMap)[] = ["keydown", "mousedown", "touchstart", "pointerdown"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    const tick = window.setInterval(() => {
      try {
        const raw = localStorage.getItem(sessionKey);
        if (!raw) { setActiveCashier(null); return; }
        const parsed = JSON.parse(raw) as { lastActivity: number };
        if (Date.now() - (parsed?.lastActivity ?? 0) > PIN_IDLE_MS) {
          localStorage.removeItem(sessionKey);
          setActiveCashier(null);
          toast.info("Locked due to inactivity. Please re-enter your PIN.");
        }
      } catch { /* noop */ }
    }, 30 * 1000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(tick);
    };
  }, [activeCashier, sessionKey]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [completedSale, setCompletedSale] = useState<SaleRecord | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [posSettings, setPosSettings] = useState<{ auto_open_drawer: boolean }>({ auto_open_drawer: true });
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [taxRate, setTaxRate] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: "", email: "", phone: "" });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const terminal = useTerminal();

  const subtotal = cart.reduce((s, i) => s + i.line_total, 0);
  const tax = Math.round((subtotal - discountAmount) * taxRate);
  const grandTotal = subtotal - discountAmount + tax;

  // Load tax rate from store location / company country
  useEffect(() => {
    if (!company?.country) return;
    supabase.from("tax_rates").select("rate").eq("country", company.country).limit(1).maybeSingle()
      .then(({ data }) => {
        if (data) setTaxRate(data.rate / 100);
      });
  }, [company?.country]);

  // Load POS settings
  useEffect(() => {
    if (!profile?.company_id) return;
    supabase.from("pos_settings").select("auto_open_drawer").eq("company_id", profile.company_id).maybeSingle()
      .then(({ data }) => {
        if (data) setPosSettings({ auto_open_drawer: data.auto_open_drawer });
      });
  }, [profile?.company_id]);

  // Load all products + cache for offline
  useEffect(() => {
    if (!profile?.company_id) return;
    const loadProducts = async () => {
      let q = supabase.from("products")
        .select("id, name, barcode, selling_price, stock_qty, category, sku, image_url")
        .eq("company_id", profile.company_id!);
      if (activeStoreId) q = q.eq("store_id", activeStoreId);
      const { data } = await q.limit(500);
      if (data) {
        setAllProducts(data);
        cacheProducts(data).catch(() => {});
      }
    };
    loadProducts();
  }, [profile?.company_id, activeStoreId]);

  // Keyboard shortcuts
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
        line_total: product.selling_price, image_url: product.image_url,
      }];
    });
    toast.success(`${product.name} added`, { duration: 1000 });
  }, []);

  // Global barcode scan listener (HID + SUNMI native)
  useEffect(() => {
    const handler = (e: Event) => {
      const product = (e as CustomEvent).detail;
      if (product) addToCart(product);
    };
    window.addEventListener("global-barcode-scan", handler);

    // SUNMI native scanner — look up product by barcode then dispatch
    const sunmiHandler = async (e: Event) => {
      const barcode = (e as CustomEvent).detail?.barcode;
      if (!barcode || !profile?.company_id) return;
      let q = supabase
        .from("products")
        .select("id, name, barcode, selling_price, stock_qty, image_url")
        .eq("company_id", profile.company_id)
        .eq("barcode", barcode);
      if (activeStoreId) q = q.eq("store_id", activeStoreId);
      const { data } = await q.maybeSingle();
      if (data) addToCart(data as any);
      else toast.error(`Unknown barcode: ${barcode}`);
    };
    window.addEventListener("sunmi-barcode", sunmiHandler);

    return () => {
      window.removeEventListener("global-barcode-scan", handler);
      window.removeEventListener("sunmi-barcode", sunmiHandler);
    };
  }, [addToCart, profile?.company_id, activeStoreId]);

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
  const clearCart = () => { setCart([]); setDiscountAmount(0); };
  const stockErrors = isRestaurant ? [] : cart.filter((i) => i.qty > i.stock_qty);

  // Trigger cash drawer + log event (tries SUNMI native first, then ESC/POS)
  const triggerCashDrawer = async (triggerType: "cash_payment" | "manual", saleId?: string) => {
    if (!profile?.company_id || !user) return;
    const sunmiOpened = await sunmiOpenDrawer();
    if (!sunmiOpened) await openCashDrawer();
    const eventData = {
      company_id: profile.company_id, store_id: activeStoreId || null,
      user_id: user.id, user_name: activeCashier?.name || profile.full_name,
      trigger_type: triggerType, sale_id: saleId || null,
    };
    if (navigator.onLine) {
      await supabase.from("drawer_events").insert(eventData);
    } else {
      await queueDrawerEvent({ id: crypto.randomUUID(), data: eventData, created_at: new Date().toISOString(), synced: false });
    }
  };

  const handleApplyDiscount = () => {
    const val = parseFloat(discountInput) || 0;
    if (val <= 0) { toast.error("Enter a valid discount amount"); return; }
    if (discountType === "percent") {
      const amount = Math.round(subtotal * (val / 100));
      setDiscountAmount(Math.min(amount, subtotal));
    } else {
      const amount = Math.round(val * 100);
      setDiscountAmount(Math.min(amount, subtotal));
    }
    setShowDiscountDialog(false);
    setDiscountInput("");
    toast.success("Discount applied");
  };

  const handleAddCustomer = async () => {
    if (!customerForm.name.trim()) { toast.error("Name is required"); return; }
    if (!customerForm.email.trim()) { toast.error("Email is required"); return; }
    if (!profile?.company_id) return;
    setSavingCustomer(true);
    const { error } = await supabase.from("customers").insert({
      company_id: profile.company_id,
      name: customerForm.name,
      email: customerForm.email,
      phone: customerForm.phone || null,
      store_id: activeStoreId,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Customer added!");
      setShowCustomerDialog(false);
      setCustomerForm({ name: "", email: "", phone: "" });
    }
    setSavingCustomer(false);
  };

  const handlePaymentComplete = async (payments: { method: string; amount: number }[], customerName?: string) => {
    if (!profile?.company_id || !user) return;
    setProcessing(true);

    try {
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
      const changeGiven = Math.max(0, totalPaid - grandTotal);
      const isPayLater = payments.length === 0;
      const hasCashPayment = payments.some(p => p.method === "cash");

      if (!navigator.onLine) {
        const offlineSaleId = crypto.randomUUID();
        await queueOfflineSale({
          id: offlineSaleId,
          data: {
            company_id: profile.company_id, cashier_id: user.id, cashier_name: activeCashier.name,
            subtotal, discount: discountAmount, tax, total: grandTotal, change_given: changeGiven,
            status: isPayLater ? "pending" : "completed", store_id: activeStoreId,
            items: cart.map(i => ({ product_id: i.product_id, product_name: i.name, qty: i.qty, unit_price: i.unit_price, line_total: i.line_total })),
            payments, customer_name: customerName,
          },
          created_at: new Date().toISOString(), synced: false,
        });
        if (hasCashPayment && posSettings.auto_open_drawer) await triggerCashDrawer("cash_payment", offlineSaleId);
        setCompletedSale({
          id: offlineSaleId, items: [...cart], subtotal, discount: discountAmount, tax, total: grandTotal,
          payments, change_given: changeGiven, cashier_name: activeCashier.name,
          created_at: new Date().toISOString(), company_name: company?.name || "", currency, company_logo: company?.logo_url,
        });
        setShowPayment(false); setCart([]); setDiscountAmount(0);
        toast.success("Sale saved offline — will sync when online");
        setProcessing(false);
        return;
      }

      const { data: sale, error: saleErr } = await supabase
        .from("sales")
        .insert({
          company_id: profile.company_id, cashier_id: user.id, cashier_name: activeCashier.name,
          subtotal, discount: discountAmount, tax, total: grandTotal, change_given: changeGiven,
          status: isPayLater ? "pending" : "completed", store_id: activeStoreId,
        })
        .select("id").single();
      if (saleErr || !sale) throw saleErr || new Error("Failed to create sale");

      await supabase.from("sale_items").insert(
        cart.map((i) => ({
          sale_id: sale.id, product_id: i.product_id, product_name: i.name,
          qty: i.qty, unit_price: i.unit_price, line_total: i.line_total,
        }))
      );

      if (payments.length > 0) {
        await supabase.from("sale_payments").insert(
          payments.map((p) => ({
            sale_id: sale.id, method: p.method, amount: p.amount,
            provider: p.method === "card" ? "mock" : null,
            reference: p.method === "card" ? `MOCK-${Date.now()}` : null,
          }))
        );
      }

      for (const item of cart) {
        const { data: currentProduct } = await supabase.from("products").select("stock_qty").eq("id", item.product_id).maybeSingle();
        const currentStock = currentProduct?.stock_qty ?? item.stock_qty;
        const { error: stockErr } = await supabase.from("products").update({ stock_qty: Math.max(0, currentStock - item.qty) }).eq("id", item.product_id);
        if (stockErr) console.error("[POS] stock update failed", stockErr);
        const { error: movErr } = await supabase.from("inventory_movements").insert({
          company_id: profile.company_id, product_id: item.product_id, product_name: item.name,
          type: "SALE" as const, qty: -item.qty, user_id: user.id, user_name: activeCashier?.name || profile.full_name,
          note: `POS Sale #${sale.id.slice(0, 8)}${isPayLater ? " (Pay Later)" : ""}`, store_id: activeStoreId,
        });
        if (movErr) console.error("[POS] movement insert failed", movErr);
      }

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
          const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 7);
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
          const { data: custData } = await supabase.from("customers").select("outstanding_balance").eq("id", customerId).single();
          await supabase.from("customers").update({ outstanding_balance: (custData?.outstanding_balance || 0) + grandTotal }).eq("id", customerId);
        }
      }

      if (hasCashPayment && posSettings.auto_open_drawer) await triggerCashDrawer("cash_payment", sale.id);

      const finalSale: SaleRecord = {
        id: sale.id, items: [...cart], subtotal, discount: discountAmount, tax, total: grandTotal,
        payments, change_given: changeGiven, cashier_name: activeCashier.name,
        created_at: new Date().toISOString(), company_name: company?.name || "", currency, company_logo: company?.logo_url,
      };

      // Auto-print receipt on SUNMI hardware (silent no-op elsewhere)
      try {
        const status = await sunmiStatus();
        if (status.printerReady) {
          await sunmiPrint(buildReceiptText(finalSale));
        }
      } catch { /* ignore print errors */ }

      // KDS broadcast for restaurants
      if (isRestaurant && !isPayLater) {
        try {
          const orderNumber = `KDS-${sale.id.slice(0, 6).toUpperCase()}`;
          const { data: kds } = await supabase.from("kitchen_orders").insert({
            company_id: profile.company_id, store_id: activeStoreId, sale_id: sale.id,
            order_number: orderNumber, status: "pending", cashier_name: activeCashier.name,
          }).select("id").single();
          if (kds) {
            await supabase.from("kitchen_order_items").insert(
              cart.map((i) => ({
                order_id: kds.id, product_id: i.product_id, product_name: i.name, qty: i.qty,
              }))
            );
          }
        } catch { /* KDS errors should never block a sale */ }
      }

      setCompletedSale(finalSale);
      setShowPayment(false); setCart([]); setDiscountAmount(0);
      toast.success(isPayLater ? "Sale recorded — added to credit ledger" : "Payment successful!");
    } catch (err: any) {
      console.error("[POS] payment failed", err);
      toast.error("Payment failed", { description: err?.message || err?.error_description || "Unknown error — check console" });
    } finally {
      setProcessing(false);
    }
  };

  const startNewSale = () => {
    setCompletedSale(null); setShowReceipt(false); setCart([]); setSearchQuery(""); setDiscountAmount(0);
    searchRef.current?.focus();
  };

  // Categories + filtering — deduplicate case-insensitively & collapse whitespace
  const categoryMap = new Map<string, string>();
  allProducts.forEach(p => {
    if (p.category && p.category.trim()) {
      const display = p.category.trim().replace(/\s+/g, " ");
      const key = display.toLowerCase();
      if (!categoryMap.has(key)) categoryMap.set(key, display);
    }
  });
  const categories = Array.from(categoryMap.values()).sort((a, b) => a.localeCompare(b));

  const filteredProducts = allProducts.filter(p => {
    const matchesCategory = !categoryFilter || (p.category && p.category.toLowerCase().trim() === categoryFilter.toLowerCase().trim());
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  // PIN GATE — require cashier authentication before using POS
  if (!activeCashier) {
    return <CashierPinScreen onAuthenticated={persistCashier} />;
  }

  // SUCCESS SCREEN
  if (completedSale && !showReceipt) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="p-8 max-w-md w-full text-center space-y-6">
          <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-primary" />
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
                <span>Status</span><span>Pay Later — Added to Credit Ledger</span>
              </div>
            )}
            {completedSale.change_given > 0 && (
              <div className="flex justify-between text-primary font-semibold">
                <span>Change</span><span>{formatMoney(completedSale.change_given, currency)}</span>
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
          <Button variant="secondary" onClick={startNewSale}><RotateCcw className="h-4 w-4 mr-2" /> New Sale</Button>
        </div>
        <PosReceipt sale={completedSale} />
      </div>
    );
  }

  // MAIN POS LAYOUT
  return (
    <div className="flex flex-col lg:flex-row gap-0 h-[calc(100dvh-3rem)] lg:h-[calc(100dvh-3.5rem)]">
      {/* LEFT: Product Grid */}
      <div className="flex-1 flex flex-col min-w-0 lg:border-r border-border min-h-0">
        {/* Search + Status Bar */}
        <div className="p-2 sm:p-3 border-b border-border space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products…"
                className="pl-10 h-11 text-base"
                autoFocus
              />
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <ScannerStatus />
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-2 sm:px-3 pt-2 pb-1 border-b border-border flex gap-1 overflow-x-auto">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`px-3 sm:px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              !categoryFilter ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 sm:px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                categoryFilter === cat ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pb-24 lg:pb-0">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No products found</p>
              <p className="text-sm mt-1">Try a different search or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 p-2 sm:p-3">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="relative bg-card border border-border rounded-lg p-2 flex flex-col items-center text-center hover:border-primary/50 hover:shadow-md active:scale-[0.98] transition-all group"
                >
                  <div className="w-full aspect-square rounded-md overflow-hidden bg-muted mb-2 flex items-center justify-center">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-8 w-8 text-muted-foreground/50" />
                    )}
                  </div>
                  <p className="font-medium text-sm leading-tight line-clamp-2 mb-0.5 w-full">{p.name}</p>
                  <p className="text-sm font-bold text-primary">{formatMoney(p.selling_price, currency)}</p>
                  <div className="absolute bottom-1.5 right-1.5 h-7 w-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity shadow-sm">
                    <Plus className="h-4 w-4" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Current Order Panel — Desktop only */}
      <div className="hidden lg:flex w-full lg:w-[380px] xl:w-[420px] flex-col shrink-0 bg-card">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg">Current Order</h2>
            <button
              onClick={() => { persistCashier(null); clearCart(); }}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Cashier: <span className="font-medium text-foreground">{activeCashier.name}</span> · Switch
            </button>
          </div>
          <div className="flex items-center gap-1">
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive h-8 px-2">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {(role === "owner" || role === "manager") && (
              <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" onClick={() => triggerCashDrawer("manual")}>
                <LockKeyhole className="h-4 w-4" />
              </Button>
            )}
            <TerminalStatus
              status={terminal.status}
              readerLabel={terminal.reader?.label}
              error={terminal.error}
              onConnect={terminal.connect}
              onDisconnect={terminal.disconnect}
            />
          </div>
        </div>

        {cart.length > 0 && (
          <div className="px-4 py-2 border-b border-border grid grid-cols-[1fr_auto_auto] gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span>Item</span>
            <span className="text-center w-24">Quantity</span>
            <span className="text-right w-16">Price</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="font-medium">No items yet</p>
              <p className="text-xs mt-1">Tap products to add them</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {cart.map((item) => (
                <div key={item.product_id} className="px-4 py-3 grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    {!isRestaurant && item.qty > item.stock_qty && (
                      <p className="text-[10px] text-destructive">Only {item.stock_qty} in stock</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 w-24 justify-center">
                    <button onClick={() => updateQty(item.product_id, -1)} className="h-6 w-6 rounded bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted/80"><Minus className="h-3 w-3" /></button>
                    <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.product_id, 1)} className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20"><Plus className="h-3 w-3" /></button>
                    <button onClick={() => removeItem(item.product_id)} className="h-6 w-6 rounded bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20"><X className="h-3 w-3" /></button>
                  </div>
                  <span className="text-sm font-semibold text-right w-16">{formatMoney(item.line_total, currency)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border p-4 space-y-3">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(subtotal, currency)}</span></div>
            {discountAmount > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>-{formatMoney(discountAmount, currency)}</span></div>}
            {taxRate > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax ({(taxRate * 100).toFixed(0)}%)</span><span>{formatMoney(tax, currency)}</span></div>}
            <div className="flex justify-between text-lg font-bold pt-1 border-t border-border"><span>Total</span><span className="text-primary">{formatMoney(grandTotal, currency)}</span></div>
          </div>

          {stockErrors.length > 0 && <p className="text-xs text-destructive text-center">{stockErrors.length} item(s) exceed stock — adjust quantities</p>}

          <Button className="w-full h-12 text-base font-bold gap-2" disabled={cart.length === 0 || stockErrors.length > 0} onClick={() => setShowPayment(true)}>
            <CreditCard className="h-5 w-5" /> Complete Sale
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => setShowCustomerDialog(true)}>
              <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Customer
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => setShowDiscountDialog(true)}>
              <Percent className="h-3.5 w-3.5 mr-1" /> Discount
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => {
              if (completedSale) setShowReceipt(true);
              else toast.info("Complete a sale first to print a receipt");
            }}>
              <Printer className="h-3.5 w-3.5 mr-1" /> Print Receipt
            </Button>
          </div>

          <p className="text-[10px] text-center text-muted-foreground">Press F2 for quick pay</p>
        </div>
      </div>

      {/* MOBILE: Floating cart button + slide-up sheet */}
      {cart.length > 0 && (
        <button
          onClick={() => setMobileCartOpen(true)}
          className="lg:hidden fixed left-3 right-3 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)] z-40 h-14 rounded-xl bg-primary text-primary-foreground shadow-lg flex items-center justify-between px-4 active:scale-[0.99] transition-transform"
        >
          <span className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <span className="font-semibold text-sm">
              {cart.reduce((s, i) => s + i.qty, 0)} item{cart.reduce((s, i) => s + i.qty, 0) === 1 ? "" : "s"} · View cart
            </span>
          </span>
          <span className="font-bold text-base">{formatMoney(grandTotal, currency)}</span>
        </button>
      )}

      {/* Mobile cart sheet */}
      <Dialog open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
        <DialogContent className="lg:hidden p-0 gap-0 max-w-full w-[100vw] sm:max-w-md max-h-[88dvh] flex flex-col rounded-t-2xl">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center justify-between text-base">
              <span>Current Order</span>
              <button
                onClick={() => { persistCashier(null); clearCart(); setMobileCartOpen(false); }}
                className="text-xs font-normal text-muted-foreground hover:text-primary"
              >
                {activeCashier.name} · Switch
              </button>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            {cart.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No items yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {cart.map((item) => (
                  <div key={item.product_id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatMoney(item.unit_price, currency)} ea · {formatMoney(item.line_total, currency)}</p>
                      {!isRestaurant && item.qty > item.stock_qty && (
                        <p className="text-[10px] text-destructive">Only {item.stock_qty} in stock</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQty(item.product_id, -1)} className="h-9 w-9 rounded-full bg-muted text-foreground flex items-center justify-center active:bg-muted/70">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-sm font-semibold w-6 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.product_id, 1)} className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center active:bg-primary/20">
                        <Plus className="h-4 w-4" />
                      </button>
                      <button onClick={() => removeItem(item.product_id)} className="h-9 w-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center ml-1 active:bg-destructive/20">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t p-4 space-y-3 bg-card">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(subtotal, currency)}</span></div>
              {discountAmount > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>-{formatMoney(discountAmount, currency)}</span></div>}
              {taxRate > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax ({(taxRate * 100).toFixed(0)}%)</span><span>{formatMoney(tax, currency)}</span></div>}
              <div className="flex justify-between text-lg font-bold pt-1 border-t"><span>Total</span><span className="text-primary">{formatMoney(grandTotal, currency)}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="h-10" onClick={() => setShowCustomerDialog(true)}>
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Customer
              </Button>
              <Button variant="outline" size="sm" className="h-10" onClick={() => setShowDiscountDialog(true)}>
                <Percent className="h-3.5 w-3.5 mr-1" /> Discount
              </Button>
            </div>

            <Button
              className="w-full h-12 text-base font-bold gap-2"
              disabled={cart.length === 0 || stockErrors.length > 0}
              onClick={() => { setMobileCartOpen(false); setShowPayment(true); }}
            >
              <CreditCard className="h-5 w-5" /> Complete Sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showPayment && (
        <PaymentModal
          total={grandTotal} currency={currency}
          onClose={() => setShowPayment(false)}
          onComplete={handlePaymentComplete}
          processing={processing}
          terminalStatus={terminal.status}
          tapToPaySupported={terminal.tapToPaySupported}
          availableReaders={terminal.availableReaders}
          connectedReader={terminal.reader}
          onTerminalPayment={(amount) => terminal.collectPayment(amount, currency.toLowerCase())}
          onRetryTerminalPayment={terminal.retryLastPayment}
          onRediscoverReaders={terminal.rediscoverReaders}
          onConnectToReader={terminal.connectToReader}
          isTerminalCollecting={terminal.isCollecting}
          onCancelTerminalCollect={terminal.cancelCollect}
          onRetryTerminal={terminal.connect}
        />
      )}

      {/* Discount Dialog */}
      <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Apply Discount</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant={discountType === "fixed" ? "default" : "outline"} size="sm" onClick={() => setDiscountType("fixed")} className="flex-1">
                Fixed Amount
              </Button>
              <Button variant={discountType === "percent" ? "default" : "outline"} size="sm" onClick={() => setDiscountType("percent")} className="flex-1">
                Percentage
              </Button>
            </div>
            <div>
              <Label>{discountType === "fixed" ? "Amount" : "Percentage"}</Label>
              <Input type="number" step="0.01" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)}
                placeholder={discountType === "fixed" ? "0.00" : "10"} className="mt-1" autoFocus />
            </div>
            <div className="flex gap-2">
              {discountAmount > 0 && (
                <Button variant="outline" className="flex-1" onClick={() => { setDiscountAmount(0); setShowDiscountDialog(false); toast.success("Discount removed"); }}>
                  Remove Discount
                </Button>
              )}
              <Button className="flex-1" onClick={handleApplyDiscount}>Apply</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} placeholder="Customer name" className="mt-1" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} placeholder="customer@example.com" className="mt-1" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} placeholder="+44..." className="mt-1" />
            </div>
            <Button className="w-full" onClick={handleAddCustomer} disabled={savingCustomer}>
              {savingCustomer ? "Saving..." : "Add Customer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
