import { PageHeader } from "@/components/PageHeader";
import { demoMovements } from "@/lib/demo-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, RefreshCw, ShoppingCart } from "lucide-react";

const typeIcons: Record<string, { icon: typeof ArrowUp; className: string }> = {
  STOCK_IN: { icon: ArrowDown, className: "text-success bg-success/10" },
  STOCK_OUT: { icon: ArrowUp, className: "text-destructive bg-destructive/10" },
  SALE: { icon: ShoppingCart, className: "text-info bg-info/10" },
  ADJUSTMENT: { icon: RefreshCw, className: "text-warning bg-warning/10" },
};

export default function InventoryMovements() {
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Stock Movements" subtitle="Audit trail of all inventory changes" />

      <div className="zentra-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>By</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demoMovements.map((m) => {
              const config = typeIcons[m.type];
              const Icon = config.icon;
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded-md flex items-center justify-center ${config.className}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-medium">{m.type.replace("_", " ")}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{m.productName}</TableCell>
                  <TableCell className={`text-right font-semibold text-sm ${m.qty > 0 ? "text-success" : "text-destructive"}`}>
                    {m.qty > 0 ? "+" : ""}{m.qty}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.userName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.note || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(m.createdAt).toLocaleDateString()}
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
