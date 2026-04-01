import { formatMoney } from "@/lib/currency";
import type { SaleRecord } from "@/pages/Cashier";
import { format } from "date-fns";

export function PosReceipt({ sale }: { sale: SaleRecord }) {
  return (
    <div className="max-w-[300px] mx-auto bg-white text-black p-6 font-mono text-xs print:shadow-none" id="pos-receipt">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="font-bold text-sm">{sale.company_name || "Stokivo POS"}</h2>
        <p className="text-[10px] text-gray-500 mt-1">
          {format(new Date(sale.created_at), "dd/MM/yyyy HH:mm")}
        </p>
        <p className="text-[10px] text-gray-500">
          Receipt #{sale.id.slice(0, 8).toUpperCase()}
        </p>
      </div>

      <div className="border-t border-dashed border-gray-300 my-2" />

      {/* Items */}
      <div className="space-y-1">
        {sale.items.map((item, i) => (
          <div key={i}>
            <div className="flex justify-between">
              <span className="truncate flex-1 pr-2">{item.name}</span>
              <span>{formatMoney(item.line_total, sale.currency)}</span>
            </div>
            <div className="text-gray-500 text-[10px] pl-2">
              {item.qty} x {formatMoney(item.unit_price, sale.currency)}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-gray-300 my-2" />

      {/* Totals */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatMoney(sale.subtotal, sale.currency)}</span>
        </div>
        {sale.discount > 0 && (
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-{formatMoney(sale.discount, sale.currency)}</span>
          </div>
        )}
        {sale.tax > 0 && (
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{formatMoney(sale.tax, sale.currency)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm">
          <span>TOTAL</span>
          <span>{formatMoney(sale.total, sale.currency)}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-300 my-2" />

      {/* Payments */}
      <div className="space-y-1">
        {sale.payments.map((p, i) => (
          <div key={i} className="flex justify-between">
            <span className="capitalize">{p.method}</span>
            <span>{formatMoney(p.amount, sale.currency)}</span>
          </div>
        ))}
        {sale.change_given > 0 && (
          <div className="flex justify-between font-bold">
            <span>CHANGE</span>
            <span>{formatMoney(sale.change_given, sale.currency)}</span>
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-gray-300 my-2" />

      {/* Footer */}
      <div className="text-center text-gray-500 text-[10px] space-y-1">
        <p>Served by: {sale.cashier_name}</p>
        <p>Thank you for your purchase!</p>
      </div>
    </div>
  );
}
