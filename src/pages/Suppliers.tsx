import { PageHeader } from "@/components/PageHeader";
import { demoSuppliers, demoProducts } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Phone, MessageCircle, Truck } from "lucide-react";

export default function Suppliers() {
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Suppliers"
        subtitle={`${demoSuppliers.length} suppliers`}
        actions={
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
            <Plus className="h-4 w-4" /> Add Supplier
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {demoSuppliers.map((supplier) => {
          const productCount = demoProducts.filter((p) => p.supplierId === supplier.id).length;
          return (
            <div key={supplier.id} className="zentra-card p-5 cursor-pointer">
              <div className="flex items-start gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Truck className="h-5 w-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground text-sm truncate">{supplier.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{supplier.address}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Products</span>
                  <span className="font-medium text-foreground">{productCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Supply</span>
                  <span className="font-medium text-foreground">{supplier.lastSupplyDate || "—"}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs"
                  onClick={() => { if (supplier.phone) window.open(`tel:${supplier.phone}`); }}
                >
                  <Phone className="h-3 w-3" /> Call
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs text-success border-success/20 hover:bg-success/5"
                  onClick={() => {
                    const num = supplier.whatsapp || supplier.phone;
                    if (num) window.open(`https://wa.me/${num.replace(/[^0-9]/g, "")}`);
                  }}
                >
                  <MessageCircle className="h-3 w-3" /> WhatsApp
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
