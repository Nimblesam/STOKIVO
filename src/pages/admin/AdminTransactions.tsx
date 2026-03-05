import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Download } from "lucide-react";
import { format } from "date-fns";

export default function AdminTransactions() {
  const [sales, setSales] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [feesByCompany, setFeesByCompany] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("sales")
        .select("*, companies(name, currency)")
        .order("created_at", { ascending: false })
        .limit(500);
      setSales(data || []);

      // Aggregate fees by company
      const companyFees: Record<string, { name: string; total: number; fees: number; currency: string }> = {};
      (data || []).forEach((s: any) => {
        const cid = s.company_id;
        if (!companyFees[cid]) companyFees[cid] = { name: s.companies?.name || "Unknown", total: 0, fees: 0, currency: s.companies?.currency || "GBP" };
        companyFees[cid].total += s.total || 0;
        companyFees[cid].fees += Math.round((s.total || 0) * 0.005);
      });
      setFeesByCompany(Object.values(companyFees).sort((a, b) => b.fees - a.fees));
    };
    load();
  }, []);

  const exportCsv = () => {
    const rows = filtered.map(s => [
      (s as any).companies?.name, format(new Date(s.created_at), "yyyy-MM-dd HH:mm"),
      (s.total / 100).toFixed(2), ((s.total * 0.005) / 100).toFixed(2),
      (s as any).companies?.currency, s.status,
    ]);
    const csv = "Company,Date,Amount,Platform Fee,Currency,Status\n" + rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "transactions.csv"; a.click();
  };

  const totalVolume = sales.reduce((s, r) => s + (r.total || 0), 0);
  const totalFees = Math.round(totalVolume * 0.005);

  const filtered = sales.filter(s =>
    (s as any).companies?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Transactions & Platform Fees</h1>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Volume</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">£{(totalVolume / 100).toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Platform Fees (0.5%)</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">£{(totalFees / 100).toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Transactions</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{sales.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">All Transactions</TabsTrigger>
          <TabsTrigger value="fees">Fees by Company</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <div className="relative w-64 mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Platform Fee</TableHead>
                  <TableHead>Net Payout</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map((s) => {
                  const fee = Math.round(s.total * 0.005);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{(s as any).companies?.name}</TableCell>
                      <TableCell className="text-xs">{format(new Date(s.created_at), "dd MMM yyyy HH:mm")}</TableCell>
                      <TableCell>£{(s.total / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-orange-600">£{(fee / 100).toFixed(2)}</TableCell>
                      <TableCell>£{((s.total - fee) / 100).toFixed(2)}</TableCell>
                      <TableCell><Badge variant="default">{s.status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="fees">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Total Volume</TableHead>
                  <TableHead>Platform Fees</TableHead>
                  <TableHead>Currency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feesByCompany.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>£{(c.total / 100).toFixed(2)}</TableCell>
                    <TableCell className="text-orange-600 font-medium">£{(c.fees / 100).toFixed(2)}</TableCell>
                    <TableCell>{c.currency}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
