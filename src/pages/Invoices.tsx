import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/currency";
import { demoInvoices, demoCustomers } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, Send } from "lucide-react";
import { useState } from "react";

const statusFilters = ["all", "draft", "sent", "partially_paid", "paid", "overdue"] as const;

export default function Invoices() {
  const [filter, setFilter] = useState<string>("all");
  const filtered = filter === "all" ? demoInvoices : demoInvoices.filter((i) => i.status === filter);

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
                    {invoice.status === "overdue" && (
                      <Button variant="outline" size="sm" className="gap-1 text-xs text-destructive border-destructive/20 hover:bg-destructive/5">
                        <Send className="h-3 w-3" /> Remind
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
