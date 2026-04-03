export type Currency = 'GBP' | 'NGN' | 'USD' | 'EUR' | 'CAD' | 'GHS' | 'KES' | 'ZAR' | 'INR' | 'AED' | 'AUD';
export type PlanTier = 'starter' | 'growth' | 'pro';
export type UserRole = 'owner' | 'manager' | 'staff';
export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue';
export type MovementType = 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'SALE';
export type AlertType = 'LOW_STOCK' | 'SUPPLIER_PRICE_CHANGE';
export type AlertSeverity = 'warning' | 'critical';
export type UnitType = 'bag' | 'carton' | 'unit' | 'kg' | 'bottle' | 'tin';

export interface Company {
  id: string;
  name: string;
  address: string;
  country: string;
  currency: Currency;
  logoUrl?: string;
  brandColor: string;
  businessType: 'wholesale' | 'retail' | 'hybrid';
  plan: PlanTier;
  subdomain?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  active: boolean;
  avatarUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  unitType: UnitType;
  costPrice: number; // minor units
  sellingPrice: number;
  profitMargin: number;
  stockQty: number;
  minStockLevel: number;
  supplierId?: string;
  expiryDate?: string;
  companyId: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email?: string;
  address: string;
  companyId: string;
  lastSupplyDate?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email?: string;
  address: string;
  notes?: string;
  companyId: string;
  outstandingBalance: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  companyId: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  subtotal: number;
  total: number;
  amountPaid: number;
  dueDate: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  qty: number;
  userId: string;
  userName: string;
  note?: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  productId: string;
  productName: string;
  message: string;
  read: boolean;
  createdAt: string;
  meta?: Record<string, unknown>;
}

export interface SupplierPriceHistory {
  id: string;
  productId: string;
  supplierId: string;
  oldCost: number;
  newCost: number;
  changedBy: string;
  changedAt: string;
}

export interface PlanConfig {
  name: string;
  tier: PlanTier;
  maxProducts: number;
  maxUsers: number;
  features: string[];
  price: Record<string, number>;
  annualPrice?: Record<string, number>;
}
