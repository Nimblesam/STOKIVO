/**
 * Offline Store - IndexedDB-based offline capability for POS operations
 * Stores pending transactions and syncs when online
 */

const DB_NAME = "stokivo-offline";
const DB_VERSION = 1;

interface PendingSale {
  id: string;
  data: {
    company_id: string;
    cashier_id: string;
    cashier_name: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    change_given: number;
    status: string;
    store_id: string | null;
    items: Array<{
      product_id: string;
      product_name: string;
      qty: number;
      unit_price: number;
      line_total: number;
    }>;
    payments: Array<{ method: string; amount: number }>;
    customer_name?: string;
  };
  created_at: string;
  synced: boolean;
}

interface PendingMovement {
  id: string;
  data: {
    company_id: string;
    product_id: string;
    product_name: string;
    type: string;
    qty: number;
    user_id: string;
    user_name: string;
    note: string;
    store_id: string | null;
  };
  created_at: string;
  synced: boolean;
}

type SyncStatus = "online" | "offline" | "syncing";

let db: IDBDatabase | null = null;
const syncListeners = new Set<(status: SyncStatus) => void>();
let currentStatus: SyncStatus = navigator.onLine ? "online" : "offline";

export function getOfflineStatus(): SyncStatus {
  return currentStatus;
}

export function subscribeOfflineStatus(cb: (status: SyncStatus) => void) {
  syncListeners.add(cb);
  return () => syncListeners.delete(cb);
}

function notifyStatus(status: SyncStatus) {
  currentStatus = status;
  syncListeners.forEach((cb) => cb(status));
}

async function openDB(): Promise<IDBDatabase> {
  if (db) return db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains("pending_sales")) {
        d.createObjectStore("pending_sales", { keyPath: "id" });
      }
      if (!d.objectStoreNames.contains("pending_movements")) {
        d.createObjectStore("pending_movements", { keyPath: "id" });
      }
      if (!d.objectStoreNames.contains("product_cache")) {
        const store = d.createObjectStore("product_cache", { keyPath: "id" });
        store.createIndex("barcode", "barcode", { unique: false });
        store.createIndex("company_id", "company_id", { unique: false });
      }
      if (!d.objectStoreNames.contains("drawer_events")) {
        d.createObjectStore("drawer_events", { keyPath: "id" });
      }
    };
    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

// Cache products for offline lookup
export async function cacheProducts(products: any[]): Promise<void> {
  const d = await openDB();
  const tx = d.transaction("product_cache", "readwrite");
  const store = tx.objectStore("product_cache");
  for (const p of products) {
    store.put(p);
  }
}

// Get cached product by barcode (offline)
export async function getCachedProductByBarcode(barcode: string, companyId: string): Promise<any | null> {
  const d = await openDB();
  return new Promise((resolve) => {
    const tx = d.transaction("product_cache", "readonly");
    const store = tx.objectStore("product_cache");
    const idx = store.index("barcode");
    const req = idx.getAll(barcode);
    req.onsuccess = () => {
      const matches = req.result.filter((p: any) => p.company_id === companyId);
      resolve(matches[0] || null);
    };
    req.onerror = () => resolve(null);
  });
}

// Get all cached products for a company
export async function getCachedProducts(companyId: string): Promise<any[]> {
  const d = await openDB();
  return new Promise((resolve) => {
    const tx = d.transaction("product_cache", "readonly");
    const store = tx.objectStore("product_cache");
    const idx = store.index("company_id");
    const req = idx.getAll(companyId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

// Queue a sale for sync
export async function queueOfflineSale(sale: PendingSale): Promise<void> {
  const d = await openDB();
  const tx = d.transaction("pending_sales", "readwrite");
  tx.objectStore("pending_sales").put(sale);
}

// Queue an inventory movement for sync
export async function queueOfflineMovement(movement: PendingMovement): Promise<void> {
  const d = await openDB();
  const tx = d.transaction("pending_movements", "readwrite");
  tx.objectStore("pending_movements").put(movement);
}

// Queue a drawer event for sync
export async function queueDrawerEvent(event: any): Promise<void> {
  const d = await openDB();
  const tx = d.transaction("drawer_events", "readwrite");
  tx.objectStore("drawer_events").put(event);
}

// Get all pending (unsynced) items
async function getPendingItems(storeName: string): Promise<any[]> {
  const d = await openDB();
  return new Promise((resolve) => {
    const tx = d.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => {
      const items = (req.result || []).filter((i: any) => !i.synced);
      resolve(items);
    };
    req.onerror = () => resolve([]);
  });
}

// Mark items as synced
async function markSynced(storeName: string, ids: string[]): Promise<void> {
  const d = await openDB();
  const tx = d.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  for (const id of ids) {
    const req = store.get(id);
    req.onsuccess = () => {
      if (req.result) {
        store.put({ ...req.result, synced: true });
      }
    };
  }
}

export function getPendingSalesCount(): Promise<number> {
  return getPendingItems("pending_sales").then((items) => items.length);
}

// Sync all pending data to Supabase
export async function syncOfflineData(supabase: any): Promise<{ salesSynced: number; movementsSynced: number; drawerEventsSynced: number }> {
  if (!navigator.onLine) return { salesSynced: 0, movementsSynced: 0, drawerEventsSynced: 0 };

  notifyStatus("syncing");
  let salesSynced = 0;
  let movementsSynced = 0;
  let drawerEventsSynced = 0;

  try {
    // Sync sales
    const pendingSales = await getPendingItems("pending_sales");
    for (const sale of pendingSales) {
      try {
        const { data: createdSale, error: saleErr } = await supabase
          .from("sales")
          .insert({
            company_id: sale.data.company_id,
            cashier_id: sale.data.cashier_id,
            cashier_name: sale.data.cashier_name,
            subtotal: sale.data.subtotal,
            discount: sale.data.discount,
            tax: sale.data.tax,
            total: sale.data.total,
            change_given: sale.data.change_given,
            status: sale.data.status,
            store_id: sale.data.store_id,
          })
          .select("id")
          .single();

        if (saleErr) throw saleErr;

        // Insert sale items
        await supabase.from("sale_items").insert(
          sale.data.items.map((i: any) => ({
            sale_id: createdSale.id,
            product_id: i.product_id,
            product_name: i.product_name,
            qty: i.qty,
            unit_price: i.unit_price,
            line_total: i.line_total,
          }))
        );

        // Insert payments
        if (sale.data.payments.length > 0) {
          await supabase.from("sale_payments").insert(
            sale.data.payments.map((p: any) => ({
              sale_id: createdSale.id,
              method: p.method,
              amount: p.amount,
            }))
          );
        }

        // Deduct stock
        for (const item of sale.data.items) {
          const { data: prod } = await supabase
            .from("products")
            .select("stock_qty")
            .eq("id", item.product_id)
            .single();
          if (prod) {
            await supabase
              .from("products")
              .update({ stock_qty: Math.max(0, prod.stock_qty - item.qty) })
              .eq("id", item.product_id);
          }
        }

        await markSynced("pending_sales", [sale.id]);
        salesSynced++;
      } catch (err) {
        console.error("Failed to sync sale:", sale.id, err);
      }
    }

    // Sync movements
    const pendingMovements = await getPendingItems("pending_movements");
    for (const mov of pendingMovements) {
      try {
        await supabase.from("inventory_movements").insert(mov.data);
        await markSynced("pending_movements", [mov.id]);
        movementsSynced++;
      } catch (err) {
        console.error("Failed to sync movement:", mov.id, err);
      }
    }

    // Sync drawer events
    const pendingDrawerEvents = await getPendingItems("drawer_events");
    for (const evt of pendingDrawerEvents) {
      try {
        await supabase.from("drawer_events").insert(evt.data);
        await markSynced("drawer_events", [evt.id]);
        drawerEventsSynced++;
      } catch (err) {
        console.error("Failed to sync drawer event:", evt.id, err);
      }
    }
  } catch (err) {
    console.error("Sync failed:", err);
  }

  notifyStatus(navigator.onLine ? "online" : "offline");
  return { salesSynced, movementsSynced, drawerEventsSynced };
}

// Initialize offline listeners
export function initOfflineSync(supabase: any) {
  // Listen for online/offline events
  window.addEventListener("online", () => {
    notifyStatus("online");
    // Auto-sync when coming back online
    syncOfflineData(supabase).then((result) => {
      const total = result.salesSynced + result.movementsSynced + result.drawerEventsSynced;
      if (total > 0) {
        // Dispatch custom event for UI notification
        window.dispatchEvent(
          new CustomEvent("offline-sync-complete", { detail: result })
        );
      }
    });
  });

  window.addEventListener("offline", () => {
    notifyStatus("offline");
  });

  // Initialize DB on startup
  openDB().catch(console.error);
}
