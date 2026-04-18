/**
 * Plain-text receipt formatter for SUNMI thermal printer (32-char width).
 */
import type { SaleRecord } from "@/pages/Cashier";
import { formatMoney } from "@/lib/currency";
import { format } from "date-fns";

const WIDTH = 32;

function padRow(left: string, right: string): string {
  const trimmedLeft = left.length > WIDTH - right.length - 1
    ? left.slice(0, WIDTH - right.length - 1)
    : left;
  const space = WIDTH - trimmedLeft.length - right.length;
  return trimmedLeft + " ".repeat(Math.max(1, space)) + right;
}

function center(text: string): string {
  if (text.length >= WIDTH) return text;
  const pad = Math.floor((WIDTH - text.length) / 2);
  return " ".repeat(pad) + text;
}

const DIVIDER = "-".repeat(WIDTH);

export function buildReceiptText(sale: SaleRecord): string {
  const lines: string[] = [];
  lines.push(center(sale.company_name || "Stokivo POS"));
  lines.push(center(format(new Date(sale.created_at), "dd/MM/yyyy HH:mm")));
  lines.push(center(`Receipt #${sale.id.slice(0, 8).toUpperCase()}`));
  lines.push(DIVIDER);

  for (const item of sale.items) {
    lines.push(padRow(item.name, formatMoney(item.line_total, sale.currency)));
    lines.push(`  ${item.qty} x ${formatMoney(item.unit_price, sale.currency)}`);
  }
  lines.push(DIVIDER);

  lines.push(padRow("Subtotal", formatMoney(sale.subtotal, sale.currency)));
  if (sale.discount > 0) lines.push(padRow("Discount", `-${formatMoney(sale.discount, sale.currency)}`));
  if (sale.tax > 0) lines.push(padRow("Tax", formatMoney(sale.tax, sale.currency)));
  lines.push(padRow("TOTAL", formatMoney(sale.total, sale.currency)));
  lines.push(DIVIDER);

  for (const p of sale.payments) {
    lines.push(padRow(p.method.toUpperCase(), formatMoney(p.amount, sale.currency)));
  }
  if (sale.change_given > 0) lines.push(padRow("CHANGE", formatMoney(sale.change_given, sale.currency)));
  lines.push(DIVIDER);
  lines.push(center(`Served by: ${sale.cashier_name}`));
  lines.push(center("Thank you!"));
  return lines.join("\n");
}
