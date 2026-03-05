import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/currency";
import { demoProducts, demoSuppliers } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Filter, Package } from "lucide-react";
import { useState } from "react";

export default function Products() {
  const [search, setSearch] = useState("");
  const filtered = demoProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Products"
        subtitle={`${demoProducts.length} products in inventory`}
        actions={
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        }
      />

      <div className="zentra-card">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, SKU, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" /> Filters
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Supplier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => {
                const supplier = demoSuppliers.find((s) => s.id === product.supplierId);
                const stockStatus = product.stockQty <= product.minStockLevel * 0.5
                  ? "critical"
                  : product.stockQty <= product.minStockLevel
                  ? "low_stock"
                  : "in_stock";
                return (
                  <TableRow key={product.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.unitType}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{product.sku}</TableCell>
                    <TableCell className="text-sm">{product.category}</TableCell>
                    <TableCell className="text-right text-sm">{formatMoney(product.costPrice)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatMoney(product.sellingPrice)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`text-sm font-medium ${product.profitMargin < 10 ? "text-destructive" : product.profitMargin > 40 ? "text-success" : "text-foreground"}`}>
                        {product.profitMargin.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">{product.stockQty}</TableCell>
                    <TableCell><StatusBadge status={stockStatus} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{supplier?.name || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
