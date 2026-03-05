import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/currency";
import { demoInvoices, demoCustomers, demoCompany } from "@/lib/demo-data";
import { InvoiceTemplate } from "@/components/InvoiceTemplate";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, FileText, Send, Eye, Printer } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Invoice } from "@/lib/types";

const statusFilters = ["all", "draft", "sent", "partially_paid", "paid", "overdue"] as const;

export default function Invoices() {
  const { company } = useAuth();
  const [filter, setFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const filtered = filter === "all" ? demoInvoices : demoInvoices.filter((i) => i.status === filter);

  const handlePrint = () => {
    window.print();
  };

  const getInvoiceCompany = () => ({
    name: company?.name || demoCompany.name,
    address: demoCompany.address,
    phone: null as string | null,
    email: null as string | null,
    company_number: null as string | null,
    logo_url: null as string | null,
    currency: (company?.currency || demoCompany.currency) as "GBP" | "NGN",
  });

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Invoices"
        subtitle={`${demoInvoices.length} invoices`}
        actions={
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {statusFilters.map((s) => (
          <Button
            key={s}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            className={filter === s ? "bg-primary text-primary-foreground" : ""}
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "All" : s === "partially_paid" ? "Partial" : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      <div className="zentra-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((invoice) => {
              const customer = demoCustomers.find((c) => c.id === invoice.customerId);
              const balance = invoice.total - invoice.amountPaid;
              return (
                <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm text-foreground">{invoice.invoiceNumber}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{customer?.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{invoice.createdAt}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{invoice.dueDate}</TableCell>
                  <TableCell><StatusBadge status={invoice.status} /></TableCell>
                  <TableCell className="text-right text-sm font-medium">{formatMoney(invoice.total)}</TableCell>
                  <TableCell className="text-right text-sm text-success">{formatMoney(invoice.amountPaid)}</TableCell>
                  <TableCell className="text-right">
                    <span className={`text-sm font-semibold ${balance > 0 ? "text-destructive" : "text-success"}`}>
                      {formatMoney(balance)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedInvoice(invoice)}
                        title="View Invoice"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {invoice.status === "overdue" && (
                        <Button variant="outline" size="sm" className="gap-1 text-xs text-destructive border-destructive/20 hover:bg-destructive/5">
                          <Send className="h-3 w-3" /> Remind
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Invoice Preview Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedInvoice?.invoiceNumber}</span>
              <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
                <Printer className="h-4 w-4" /> Print
              </Button>
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <InvoiceTemplate
              company={getInvoiceCompany()}
              invoice={{
                invoiceNumber: selectedInvoice.invoiceNumber,
                status: selectedInvoice.status,
                createdAt: selectedInvoice.createdAt,
                dueDate: selectedInvoice.dueDate,
                customerName: demoCustomers.find((c) => c.id === selectedInvoice.customerId)?.name || "",
                customerAddress: demoCustomers.find((c) => c.id === selectedInvoice.customerId)?.address,
                customerPhone: demoCustomers.find((c) => c.id === selectedInvoice.customerId)?.phone,
                customerEmail: demoCustomers.find((c) => c.id === selectedInvoice.customerId)?.email,
                items: selectedInvoice.items.map((it) => ({
                  productName: it.productName,
                  qty: it.qty,
                  unitPrice: it.unitPrice,
                  total: it.total,
                })),
                subtotal: selectedInvoice.subtotal,
                total: selectedInvoice.total,
                amountPaid: selectedInvoice.amountPaid,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
