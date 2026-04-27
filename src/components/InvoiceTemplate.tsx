import { formatMoney } from "@/lib/currency";
import type { Currency } from "@/lib/types";
import { Separator } from "@/components/ui/separator";

interface InvoiceCompany {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  company_number?: string | null;
  logo_url?: string | null;
  currency: Currency;
  brand_color?: string | null;
  enable_offline_payments?: boolean | null;
  payment_instructions?: string | null;
}

interface InvoiceItem {
  productName: string;
  qty: number;
  unitPrice: number;
  total: number;
}

interface InvoiceData {
  invoiceNumber: string;
  status: string;
  createdAt: string;
  dueDate: string;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: InvoiceItem[];
  subtotal: number;
  total: number;
  amountPaid: number;
}

interface InvoiceTemplateProps {
  company: InvoiceCompany;
  invoice: InvoiceData;
  /** When true, render in compact PDF mode (tight spacing to fit one A4 page). */
  compact?: boolean;
}

export function InvoiceTemplate({ company, invoice, compact = false }: InvoiceTemplateProps) {
  const balance = invoice.total - invoice.amountPaid;
  const currency = company.currency || "GBP";
  const brandColor = company.brand_color || "#0d9488";
  const showPaymentInstructions =
    !!company.enable_offline_payments && !!company.payment_instructions?.trim();

  // Compact-mode classes shrink padding/margins to keep PDF on a single A4 page.
  const wrapPad = compact ? "p-6" : "p-8";
  const headerMb = compact ? "mb-4" : "mb-8";
  const sepMb = compact ? "mb-3" : "mb-6";
  const billMb = compact ? "mb-4" : "mb-8";
  const tableMb = compact ? "mb-4" : "mb-8";
  const rowPad = compact ? "py-2" : "py-3";
  const footerMt = compact ? "mt-6 pt-3" : "mt-12 pt-6";

  return (
    <div className={`bg-white text-foreground ${wrapPad} max-w-[800px] mx-auto print:p-0`} id="invoice-print">
      {/* Accent bar */}
      <div className={`h-2 rounded-full ${compact ? "mb-3" : "mb-6"}`} style={{ backgroundColor: brandColor }} />
      {/* Header */}
      <div className={`flex justify-between items-start ${headerMb}`}>
        <div>
          {company.logo_url ? (
            <div className="mb-2">
              <img
                src={company.logo_url}
                alt={company.name}
                crossOrigin="anonymous"
                loading="eager"
                decoding="sync"
                className={`${compact ? "h-16" : "h-20"} w-auto max-w-[260px] object-contain`}
                style={{ imageRendering: "auto" }}
              />
              <h2 className="sr-only">{company.name}</h2>
            </div>
          ) : (
            <h2 className="text-2xl font-display font-bold" style={{ color: brandColor }}>{company.name}</h2>
          )}
          {company.address && <p className="text-sm text-muted-foreground mt-1">{company.address}</p>}
          {company.phone && <p className="text-sm text-muted-foreground">{company.phone}</p>}
          {company.email && <p className="text-sm text-muted-foreground">{company.email}</p>}
          {company.company_number && (
            <p className="text-xs text-muted-foreground mt-1">Company No: {company.company_number}</p>
          )}
        </div>
        <div className="text-right">
          <h1 className={`${compact ? "text-2xl" : "text-3xl"} font-display font-bold`} style={{ color: brandColor }}>INVOICE</h1>
          <p className="text-sm font-semibold text-foreground mt-1">{invoice.invoiceNumber}</p>
          <div className="mt-2 text-sm text-muted-foreground space-y-0.5">
            <p>Date: {(invoice.createdAt || "").slice(0, 10)}</p>
            <p>Due: {(invoice.dueDate || "").slice(0, 10)}</p>
          </div>
        </div>
      </div>

      <Separator className={sepMb} />

      {/* Bill To */}
      <div className={billMb}>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bill To</p>
        <p className="font-semibold text-foreground">{invoice.customerName}</p>
        {invoice.customerAddress && <p className="text-sm text-muted-foreground">{invoice.customerAddress}</p>}
        {invoice.customerPhone && <p className="text-sm text-muted-foreground">{invoice.customerPhone}</p>}
        {invoice.customerEmail && <p className="text-sm text-muted-foreground">{invoice.customerEmail}</p>}
      </div>

      {/* Items Table */}
      <table className={`w-full text-sm ${tableMb}`}>
        <thead>
          <tr style={{ borderBottomColor: brandColor, borderBottomWidth: 2 }}>
            <th className={`text-left ${rowPad} font-semibold text-foreground`}>Item</th>
            <th className={`text-right ${rowPad} font-semibold text-foreground`}>Qty</th>
            <th className={`text-right ${rowPad} font-semibold text-foreground`}>Unit Price</th>
            <th className={`text-right ${rowPad} font-semibold text-foreground`}>Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr key={i} className="border-b border-foreground/5">
              <td className={`${rowPad} text-foreground`}>{item.productName}</td>
              <td className={`${rowPad} text-right text-muted-foreground`}>{item.qty}</td>
              <td className={`${rowPad} text-right text-muted-foreground`}>{formatMoney(item.unitPrice, currency)}</td>
              <td className={`${rowPad} text-right font-medium text-foreground`}>{formatMoney(item.total, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium text-foreground">{formatMoney(invoice.subtotal, currency)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-base font-bold">
            <span className="text-foreground">Total</span>
            <span className="text-foreground">{formatMoney(invoice.total, currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount Paid</span>
            <span className="text-success">{formatMoney(invoice.amountPaid, currency)}</span>
          </div>
          {balance > 0 && (
            <div className="flex justify-between text-sm font-semibold pt-1 border-t">
              <span className="text-destructive">Balance Due</span>
              <span className="text-destructive">{formatMoney(balance, currency)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Offline Payment Instructions */}
      {showPaymentInstructions && (
        <div className={`${compact ? "mt-4 pt-3" : "mt-8 pt-4"} border-t`}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: brandColor }}>
            Payment Instructions
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {company.payment_instructions}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className={`${footerMt} border-t text-center text-xs text-muted-foreground`}>
        <p>Thank you for your business!</p>
        <p className="mt-1">{company.name}{company.company_number ? ` · Company No: ${company.company_number}` : ""}{company.address ? ` · ${company.address}` : ""}</p>
      </div>
    </div>
  );
}
