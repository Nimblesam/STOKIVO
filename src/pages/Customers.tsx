import { PageHeader } from "@/components/PageHeader";
import { demoCustomers, demoInvoices } from "@/lib/demo-data";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Phone, MessageCircle, Users } from "lucide-react";

export default function Customers() {
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Customers"
        subtitle={`${demoCustomers.length} customers`}
        actions={
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
            <Plus className="h-4 w-4" /> Add Customer
          </Button>
        }
      />

      <div className="zentra-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="text-right">Invoices</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demoCustomers.map((customer) => {
              const invoiceCount = demoInvoices.filter((i) => i.customerId === customer.id).length;
              return (
                <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{customer.name}</p>
                        {customer.email && <p className="text-xs text-muted-foreground">{customer.email}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{customer.phone}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{customer.address}</TableCell>
                  <TableCell className="text-right">
                    <span className={`text-sm font-semibold ${customer.outstandingBalance > 0 ? "text-destructive" : "text-success"}`}>
                      {formatMoney(customer.outstandingBalance)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm">{invoiceCount}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (customer.phone) window.open(`tel:${customer.phone}`); }}>
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-success"
                        onClick={() => {
                          const num = customer.whatsapp || customer.phone;
                          if (num) window.open(`https://wa.me/${num.replace(/[^0-9]/g, "")}`);
                        }}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
