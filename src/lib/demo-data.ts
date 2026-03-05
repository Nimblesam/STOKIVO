import type { Company, User, Product, Supplier, Customer, Invoice, InventoryMovement, Alert, SupplierPriceHistory, PlanConfig } from './types';

export const PLANS: PlanConfig[] = [
  { name: 'Starter', tier: 'starter', maxProducts: 500, maxUsers: 1, price: { GBP: 1900, NGN: 500000 }, features: ['500 products', 'Low stock alerts', '1 user', 'Basic analytics'] },
  { name: 'Growth', tier: 'growth', maxProducts: 2000, maxUsers: 3, price: { GBP: 4900, NGN: 1500000 }, features: ['2,000 products', 'Advanced analytics', 'Invoicing + reminders', 'Supplier tracking', '3 users', 'Branding customization'] },
  { name: 'Pro', tier: 'pro', maxProducts: Infinity, maxUsers: Infinity, price: { GBP: 9900, NGN: 3500000 }, features: ['Unlimited products', 'Multi-branch support', 'Custom domain', 'Advanced analytics', 'Priority alerts', 'Unlimited staff'] },
];

export const demoCompany: Company = {
  id: 'c1',
  name: 'Mama Africa Wholesale',
  address: '45 Peckham High Street, London SE15 5EB',
  country: 'UK',
  currency: 'GBP',
  brandColor: '#0d9488',
  businessType: 'wholesale',
  plan: 'growth',
};

export const demoUser: User = {
  id: 'u1',
  email: 'admin@mamaafrica.co.uk',
  name: 'Chioma Okafor',
  role: 'owner',
  companyId: 'c1',
  active: true,
};

export const demoSuppliers: Supplier[] = [
  { id: 's1', name: 'Lagos Rice Imports Ltd', phone: '+447700900001', whatsapp: '+447700900001', address: '12 Warehouse Lane, Tilbury, Essex', companyId: 'c1', lastSupplyDate: '2026-02-20' },
  { id: 's2', name: 'Nkem Foods Trading', phone: '+2348012345678', whatsapp: '+2348012345678', address: '23 Alaba Int\'l Market, Lagos', companyId: 'c1', lastSupplyDate: '2026-02-15' },
  { id: 's3', name: 'GoldPalm Oil Supplies', phone: '+447700900003', whatsapp: '+447700900003', address: '8 Industrial Park, Birmingham B7 4QR', companyId: 'c1', lastSupplyDate: '2026-01-28' },
  { id: 's4', name: 'Spice Kingdom UK', phone: '+447700900004', whatsapp: '+447700900004', address: '5 Spice Row, Manchester M4 1HQ', companyId: 'c1', lastSupplyDate: '2026-02-25' },
];

const cats = ['Rice & Grains', 'Oils & Fats', 'Spices & Seasonings', 'Root & Tubers', 'Beverages', 'Canned Goods', 'Flour & Baking'];

export const demoProducts: Product[] = [
  { id: 'p1', name: '50kg Royal Stallion Rice', sku: 'ZEN-RIC-001', barcode: '5901234123457', category: cats[0], unitType: 'bag', costPrice: 3200, sellingPrice: 4200, profitMargin: 31.25, stockQty: 45, minStockLevel: 20, supplierId: 's1', companyId: 'c1', createdAt: '2026-01-10' },
  { id: 'p2', name: '25kg Mama Gold Rice', sku: 'ZEN-RIC-002', barcode: '5901234123458', category: cats[0], unitType: 'bag', costPrice: 1800, sellingPrice: 2400, profitMargin: 33.33, stockQty: 60, minStockLevel: 25, supplierId: 's1', companyId: 'c1', createdAt: '2026-01-10' },
  { id: 'p3', name: '5L Red Palm Oil (Drum)', sku: 'ZEN-OIL-001', barcode: '5901234123459', category: cats[1], unitType: 'bottle', costPrice: 850, sellingPrice: 1200, profitMargin: 41.18, stockQty: 30, minStockLevel: 15, supplierId: 's3', companyId: 'c1', createdAt: '2026-01-12' },
  { id: 'p4', name: '4L Groundnut Oil', sku: 'ZEN-OIL-002', barcode: '5901234123460', category: cats[1], unitType: 'bottle', costPrice: 650, sellingPrice: 950, profitMargin: 46.15, stockQty: 8, minStockLevel: 10, supplierId: 's3', companyId: 'c1', createdAt: '2026-01-12' },
  { id: 'p5', name: '10kg Garri (White)', sku: 'ZEN-TUB-001', barcode: '5901234123461', category: cats[3], unitType: 'bag', costPrice: 400, sellingPrice: 650, profitMargin: 62.5, stockQty: 80, minStockLevel: 30, supplierId: 's2', companyId: 'c1', createdAt: '2026-01-15' },
  { id: 'p6', name: '5kg Egusi (Ground)', sku: 'ZEN-SPI-001', barcode: '5901234123462', category: cats[2], unitType: 'bag', costPrice: 1200, sellingPrice: 1750, profitMargin: 45.83, stockQty: 25, minStockLevel: 10, supplierId: 's2', companyId: 'c1', createdAt: '2026-01-15' },
  { id: 'p7', name: 'Cameroon Pepper (1kg)', sku: 'ZEN-SPI-002', barcode: '5901234123463', category: cats[2], unitType: 'kg', costPrice: 350, sellingPrice: 550, profitMargin: 57.14, stockQty: 40, minStockLevel: 15, supplierId: 's4', companyId: 'c1', createdAt: '2026-01-18' },
  { id: 'p8', name: 'Suya Spice Mix (500g)', sku: 'ZEN-SPI-003', barcode: '5901234123464', category: cats[2], unitType: 'unit', costPrice: 180, sellingPrice: 300, profitMargin: 66.67, stockQty: 3, minStockLevel: 20, supplierId: 's4', companyId: 'c1', createdAt: '2026-01-18' },
  { id: 'p9', name: 'Malt Drink (Carton x24)', sku: 'ZEN-BEV-001', barcode: '5901234123465', category: cats[4], unitType: 'carton', costPrice: 900, sellingPrice: 1350, profitMargin: 50, stockQty: 55, minStockLevel: 20, supplierId: 's2', companyId: 'c1', createdAt: '2026-01-20' },
  { id: 'p10', name: 'Peak Milk (Carton x48)', sku: 'ZEN-BEV-002', barcode: '5901234123466', category: cats[4], unitType: 'carton', costPrice: 1600, sellingPrice: 2200, profitMargin: 37.5, stockQty: 18, minStockLevel: 10, supplierId: 's2', companyId: 'c1', createdAt: '2026-01-20' },
  { id: 'p11', name: 'Tomato Paste (Carton x50)', sku: 'ZEN-CAN-001', barcode: '5901234123467', category: cats[5], unitType: 'carton', costPrice: 1100, sellingPrice: 1600, profitMargin: 45.45, stockQty: 35, minStockLevel: 15, supplierId: 's2', companyId: 'c1', createdAt: '2026-01-22' },
  { id: 'p12', name: '50kg Semolina Flour', sku: 'ZEN-FLR-001', barcode: '5901234123468', category: cats[6], unitType: 'bag', costPrice: 2800, sellingPrice: 3700, profitMargin: 32.14, stockQty: 22, minStockLevel: 10, supplierId: 's1', companyId: 'c1', createdAt: '2026-01-22' },
];

export const demoCustomers: Customer[] = [
  { id: 'cu1', name: 'Ade\'s Mini Mart', phone: '+447700800001', whatsapp: '+447700800001', email: 'ade@minimart.co.uk', address: '89 Brixton Rd, London SW9', companyId: 'c1', outstandingBalance: 12500, notes: 'Reliable weekly buyer' },
  { id: 'cu2', name: 'Nkechi\'s Shop', phone: '+447700800002', whatsapp: '+447700800002', address: '12 Old Kent Rd, London SE1', companyId: 'c1', outstandingBalance: 4800 },
  { id: 'cu3', name: 'Emeka Food Store', phone: '+447700800003', whatsapp: '+447700800003', email: 'emeka@gmail.com', address: '34 High St, Croydon CR0', companyId: 'c1', outstandingBalance: 0 },
  { id: 'cu4', name: 'Grace African Kitchen', phone: '+447700800004', whatsapp: '+447700800004', address: '56 Lewisham Way, London SE13', companyId: 'c1', outstandingBalance: 8900 },
];

export const demoInvoices: Invoice[] = [
  {
    id: 'inv1', invoiceNumber: 'INV-2026-001', customerId: 'cu1', companyId: 'c1', status: 'paid',
    items: [
      { id: 'ii1', productId: 'p1', productName: '50kg Royal Stallion Rice', qty: 5, unitPrice: 4200, total: 21000 },
      { id: 'ii2', productId: 'p3', productName: '5L Red Palm Oil (Drum)', qty: 10, unitPrice: 1200, total: 12000 },
    ],
    subtotal: 33000, total: 33000, amountPaid: 33000, dueDate: '2026-02-15', createdAt: '2026-02-01',
  },
  {
    id: 'inv2', invoiceNumber: 'INV-2026-002', customerId: 'cu2', companyId: 'c1', status: 'partially_paid',
    items: [
      { id: 'ii3', productId: 'p5', productName: '10kg Garri (White)', qty: 20, unitPrice: 650, total: 13000 },
      { id: 'ii4', productId: 'p6', productName: '5kg Egusi (Ground)', qty: 5, unitPrice: 1750, total: 8750 },
    ],
    subtotal: 21750, total: 21750, amountPaid: 16950, dueDate: '2026-03-01', createdAt: '2026-02-10',
  },
  {
    id: 'inv3', invoiceNumber: 'INV-2026-003', customerId: 'cu4', companyId: 'c1', status: 'overdue',
    items: [
      { id: 'ii5', productId: 'p2', productName: '25kg Mama Gold Rice', qty: 10, unitPrice: 2400, total: 24000 },
    ],
    subtotal: 24000, total: 24000, amountPaid: 15100, dueDate: '2026-02-20', createdAt: '2026-02-05',
  },
  {
    id: 'inv4', invoiceNumber: 'INV-2026-004', customerId: 'cu1', companyId: 'c1', status: 'draft',
    items: [
      { id: 'ii6', productId: 'p9', productName: 'Malt Drink (Carton x24)', qty: 8, unitPrice: 1350, total: 10800 },
      { id: 'ii7', productId: 'p7', productName: 'Cameroon Pepper (1kg)', qty: 5, unitPrice: 550, total: 2750 },
    ],
    subtotal: 13550, total: 13550, amountPaid: 0, dueDate: '2026-03-15', createdAt: '2026-03-01',
  },
];

export const demoAlerts: Alert[] = [
  { id: 'a1', type: 'LOW_STOCK', severity: 'critical', productId: 'p8', productName: 'Suya Spice Mix (500g)', message: 'Critical: Only 3 units left (min: 20)', read: false, createdAt: '2026-03-04' },
  { id: 'a2', type: 'LOW_STOCK', severity: 'warning', productId: 'p4', productName: '4L Groundnut Oil', message: 'Warning: 8 units left (min: 10)', read: false, createdAt: '2026-03-04' },
  { id: 'a3', type: 'SUPPLIER_PRICE_CHANGE', severity: 'warning', productId: 'p1', productName: '50kg Royal Stallion Rice', message: 'Cost increased from £30.00 to £32.00 (+6.7%)', read: false, createdAt: '2026-03-03', meta: { oldCost: 3000, newCost: 3200, supplierId: 's1' } },
  { id: 'a4', type: 'SUPPLIER_PRICE_CHANGE', severity: 'critical', productId: 'p3', productName: '5L Red Palm Oil (Drum)', message: 'Cost increased from £6.50 to £8.50 (+30.8%) – Margin at risk!', read: true, createdAt: '2026-02-28', meta: { oldCost: 650, newCost: 850, supplierId: 's3' } },
];

export const demoMovements: InventoryMovement[] = [
  { id: 'm1', productId: 'p1', productName: '50kg Royal Stallion Rice', type: 'STOCK_IN', qty: 50, userId: 'u1', userName: 'Chioma Okafor', note: 'New shipment from Lagos Rice', createdAt: '2026-02-20T10:30:00Z' },
  { id: 'm2', productId: 'p1', productName: '50kg Royal Stallion Rice', type: 'SALE', qty: -5, userId: 'u1', userName: 'Chioma Okafor', note: 'INV-2026-001', createdAt: '2026-02-01T14:00:00Z' },
  { id: 'm3', productId: 'p5', productName: '10kg Garri (White)', type: 'SALE', qty: -20, userId: 'u1', userName: 'Chioma Okafor', note: 'INV-2026-002', createdAt: '2026-02-10T09:15:00Z' },
  { id: 'm4', productId: 'p8', productName: 'Suya Spice Mix (500g)', type: 'ADJUSTMENT', qty: -7, userId: 'u1', userName: 'Chioma Okafor', note: 'Damaged stock removed', createdAt: '2026-03-02T16:00:00Z' },
  { id: 'm5', productId: 'p3', productName: '5L Red Palm Oil (Drum)', type: 'STOCK_IN', qty: 15, userId: 'u1', userName: 'Chioma Okafor', note: 'Restock from GoldPalm', createdAt: '2026-01-28T11:00:00Z' },
];

export const demoPriceHistory: SupplierPriceHistory[] = [
  { id: 'ph1', productId: 'p1', supplierId: 's1', oldCost: 2800, newCost: 3000, changedBy: 'Chioma Okafor', changedAt: '2026-01-15' },
  { id: 'ph2', productId: 'p1', supplierId: 's1', oldCost: 3000, newCost: 3200, changedBy: 'Chioma Okafor', changedAt: '2026-03-03' },
  { id: 'ph3', productId: 'p3', supplierId: 's3', oldCost: 650, newCost: 850, changedBy: 'Chioma Okafor', changedAt: '2026-02-28' },
];
