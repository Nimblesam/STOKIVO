import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/currency";
import { demoCustomers, demoInvoices } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Users, AlertTriangle, Clock, Phone, MessageCircle, FileText, Eye } from "lucide-react";
import { useState } from "react";

export default function CreditLedger() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Customers with credit (outstanding > 0)
  const creditCustomers = demoCustomers
    .filter((c) => c.outstandingBalance > 0)
    .sort((a, b) => b.outstandingBalance - a.outstandingBalance);

  const totalOutstanding = creditCustomers.reduce((s, c) => s + c.outstandingBalance, 0);
  const overdueInvoices = demoInvoices.filter((i) => i.status === "overdue");
  const totalOverdue = overdueInvoices.reduce((s, i) => s + (i.total - i.amountPaid), 0);

  // Invoices for selected customer
  const selectedCustomer = demoCustomers.find((c) => c.id === selectedCustomerId);
  const customerInvoices = demoInvoices
    .filter((i) => i.customerId === selectedCustomerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Credit Ledger"
        subtitle="Track who owes money, how much, and when it's due"
      />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="zentra-card p-4 border-destructive/20">
          <p className="text-xs text-muted-foreground font-medium">Total Outstanding</p>
          <p className="text-2xl font-display font-bold text-destructive mt-1">{formatMoney(totalOutstanding)}</p>
        </div>
        <div className="zentra-card p-4 border-warning/20">
          <p className="text-xs text-muted-foreground font-medium">Overdue Amount</p>
          <p className="text-2xl font-display font-bold text-warning mt-1">{formatMoney(totalOverdue)}</p>
        </div>
        <div className="zentra-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Debtors</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{creditCustomers.length}</p>
        </div>
        <div className="zentra-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Overdue Invoices</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{overdueInvoices.length}</p>
        </div>
      </div>

      {/* Debtors Table */}
      <div className="zentra-card overflow-hidden mb-6">
        <div className="p-4 border-b">
          <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" /> Who Owes Money
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Invoices</TableHead>
              <TableHead>Oldest Due</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {creditCustomers.map((customer) => {
              const custInvoices = demoInvoices.filter((i) => i.customerId === customer.id && i.status !== "paid" && i.status !== "draft");
              const oldestDue = custInvoices.reduce((oldest, i) => {
                const d = new Date(i.dueDate);
                return d < oldest ? d : oldest;
              }, new Date());
              const daysOverdue = Math.max(0, Math.floor((Date.now() - oldestDue.getTime()) / (1000 * 60 * 60 * 24)));
              const hasOverdue = custInvoices.some((i) => i.status === "overdue");
              const totalInvoiced = custInvoices.reduce((s, i) => s + i.total, 0);
              const paidPct = totalInvoiced > 0 ? ((totalInvoiced - customer.outstandingBalance) / totalInvoiced) * 100 : 0;

              return (
                <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedCustomerId(customer.id)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${hasOverdue ? "bg-destructive/10" : "bg-accent/10"}`}>
                        <Users className={`h-4 w-4 ${hasOverdue ? "text-destructive" : "text-accent"}`} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{customer.name}</p>
                        {customer.notes && <p className="text-xs text-muted-foreground">{customer.notes}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{customer.phone}</TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-bold text-destructive">{formatMoney(customer.outstandingBalance)}</span>
                    <div className="mt-1">
                      <Progress value={paidPct} className="h-1 w-20 ml-auto [&>div]:bg-success" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{custInvoices.length} active</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className={`text-sm ${daysOverdue > 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {daysOverdue > 0 ? `${daysOverdue}d overdue` : oldestDue.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {hasOverdue ? (
                      <StatusBadge status="overdue" />
                    ) : (
                      <StatusBadge status="warning" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { if (customer.phone) window.open(`tel:${customer.phone}`); }}
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-success"
                        onClick={() => {
                          const num = customer.whatsapp || customer.phone;
                          if (num) {
                            const msg = encodeURIComponent(
                              `Hi ${customer.name}, this is a friendly reminder about your outstanding balance of ${formatMoney(customer.outstandingBalance)}. Please arrange payment at your earliest convenience. Thank you!`
                            );
                            window.open(`https://wa.me/${num.replace(/[^0-9]/g, "")}?text=${msg}`);
                          }
                        }}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedCustomerId(customer.id)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Overdue Invoices */}
      {overdueInvoices.length > 0 && (
        <div className="zentra-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="font-display font-semibold text-foreground text-sm">Overdue Invoices</h3>
          </div>
          <div className="space-y-2">
            {overdueInvoices.map((inv) => {
              const customer = demoCustomers.find((c) => c.id === inv.customerId);
              const balance = inv.total - inv.amountPaid;
              const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
              return (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/[0.03] border border-destructive/10">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-destructive" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{customer?.name} • Due {inv.dueDate}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-destructive">{formatMoney(balance)}</p>
                    <p className="text-[10px] text-destructive">{daysOverdue} days overdue</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomerId} onOpenChange={() => setSelectedCustomerId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              {selectedCustomer?.name} — Credit History
            </DialogTitle>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-4 py-2">
              <div className="flex justify-between items-center p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                <span className="text-sm text-muted-foreground">Outstanding Balance</span>
                <span className="text-lg font-bold text-destructive">{formatMoney(selectedCustomer.outstandingBalance)}</span>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Invoice History</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {customerInvoices.map((inv) => {
                    const balance = inv.total - inv.amountPaid;
                    const paidPct = (inv.amountPaid / inv.total) * 100;
                    return (
                      <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="text-sm font-medium text-foreground">{inv.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {inv.createdAt} • Due: {inv.dueDate}
                          </p>
                          <Progress value={paidPct} className="h-1 w-24 mt-1 [&>div]:bg-success" />
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">{formatMoney(inv.total)}</p>
                          <StatusBadge status={inv.status} />
                          {balance > 0 && (
                            <p className="text-xs text-destructive mt-0.5">Owes: {formatMoney(balance)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {customerInvoices.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No invoices found</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
