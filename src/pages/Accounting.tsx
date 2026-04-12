import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatMoney } from "@/lib/currency";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Download, TrendingUp, TrendingDown, DollarSign, Package, ArrowDownRight, Plus, Trash2, Receipt, Wallet, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";
import type { Currency } from "@/lib/types";

const EXPENSE_CATEGORIES = ["Rent", "Utilities", "Transport", "Marketing", "Salaries", "Supplies", "Insurance", "Maintenance", "General"];

export default function Accounting() {
  const { profile, company } = useAuth();
  const currency = (company?.currency || "GBP") as Currency;
  const country = company?.country || "UK";
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const [sales, setSales] = useState<any[]>([]);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ amount: "", category: "General", description: "", expense_date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  const cid = profile?.company_id;

  const fetchData = () => {
    if (!cid) return;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(period));
    setLoading(true);

    Promise.all([
      supabase.from("sales").select("id, total, created_at").eq("company_id", cid).gte("created_at", since.toISOString()),
      supabase.from("sale_items").select("product_id, product_name, qty, unit_price, line_total, sales!inner(company_id, created_at)").eq("sales.company_id", cid).gte("sales.created_at", since.toISOString()),
      supabase.from("products").select("id, name, cost_price, selling_price, stock_qty").eq("company_id", cid),
      supabase.from("expenses").select("*").eq("company_id", cid).gte("expense_date", since.toISOString().slice(0, 10)).order("expense_date", { ascending: false }),
      supabase.from("tax_rates").select("*"),
    ]).then(([sRes, siRes, pRes, eRes, tRes]) => {
      setSales(sRes.data || []);
      setSaleItems(siRes.data || []);
      setProducts(pRes.data || []);
      setExpenses(eRes.data || []);
      setTaxRates(tRes.data || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, [cid, period]);

  const salesTaxRate = useMemo(() => taxRates.find(t => t.country === country && t.tax_type === "sales")?.rate || 0, [taxRates, country]);
  const incomeTaxRate = useMemo(() => taxRates.find(t => t.country === country && t.tax_type === "income")?.rate || 0, [taxRates, country]);
  const salesTaxName = useMemo(() => taxRates.find(t => t.country === country && t.tax_type === "sales")?.name || "Sales Tax", [taxRates, country]);
  const incomeTaxName = useMemo(() => taxRates.find(t => t.country === country && t.tax_type === "income")?.name || "Income Tax", [taxRates, country]);

  const totalRevenue = sales.reduce((s, r) => s + r.total, 0);
  const productCostMap = new Map(products.map(p => [p.id, p.cost_price]));
  const totalCOGS = saleItems.reduce((s, si) => s + (productCostMap.get(si.product_id) || 0) * si.qty, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100).toFixed(1) : "0.0";
  const inventoryValue = products.reduce((s, p) => s + p.cost_price * p.stock_qty, 0);
  const retailValue = products.reduce((s, p) => s + p.selling_price * p.stock_qty, 0);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const estimatedSalesTax = Math.round(totalRevenue * Number(salesTaxRate));
  const netRevenue = totalRevenue - estimatedSalesTax;
  const operatingProfit = grossProfit - totalExpenses;
  const estimatedIncomeTax = Math.round(Math.max(0, operatingProfit) * Number(incomeTaxRate));
  const netProfit = operatingProfit - estimatedIncomeTax;

  // Daily chart data
  const dailyMap = new Map<string, { revenue: number; cost: number }>();
  sales.forEach(s => {
    const day = new Date(s.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    const e = dailyMap.get(day) || { revenue: 0, cost: 0 };
    e.revenue += s.total;
    dailyMap.set(day, e);
  });
  saleItems.forEach((si: any) => {
    const day = new Date(si.sales?.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    const e = dailyMap.get(day) || { revenue: 0, cost: 0 };
    e.cost += (productCostMap.get(si.product_id) || 0) * si.qty;
    dailyMap.set(day, e);
  });
  const chartData = Array.from(dailyMap.entries())
    .map(([day, v]) => ({ day, revenue: v.revenue, cost: v.cost, profit: v.revenue - v.cost }))
    .sort((a, b) => {
      const p = (s: string) => { const [d, m] = s.split(" "); return new Date(`${d} ${m} ${new Date().getFullYear()}`); };
      return p(a.day).getTime() - p(b.day).getTime();
    });

  // Top products
  const ppMap = new Map<string, { revenue: number; cost: number; qty: number }>();
  saleItems.forEach((si: any) => {
    const e = ppMap.get(si.product_name) || { revenue: 0, cost: 0, qty: 0 };
    e.revenue += si.line_total; e.cost += (productCostMap.get(si.product_id) || 0) * si.qty; e.qty += si.qty;
    ppMap.set(si.product_name, e);
  });
  const topProducts = [...ppMap.entries()].map(([name, v]) => ({ name, ...v, profit: v.revenue - v.cost })).sort((a, b) => b.profit - a.profit).slice(0, 8);

  // Expense by category
  const expByCat = expenses.reduce((acc: Record<string, number>, e: any) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const handleAddExpense = async () => {
    if (!cid || !expenseForm.amount) return;
    setSaving(true);
    const { error } = await supabase.from("expenses").insert({
      company_id: cid,
      amount: Math.round(parseFloat(expenseForm.amount) * 100),
      category: expenseForm.category,
      description: expenseForm.description || null,
      expense_date: expenseForm.expense_date,
      created_by: profile?.id || null,
    } as any);
    setSaving(false);
    if (error) { toast.error("Failed to add expense"); return; }
    toast.success("Expense added");
    setAddExpenseOpen(false);
    setExpenseForm({ amount: "", category: "General", description: "", expense_date: new Date().toISOString().slice(0, 10) });
    fetchData();
  };

  const handleDeleteExpense = async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id);
    toast.success("Expense deleted");
    fetchData();
  };

  const exportCSV = () => {
    const rows = [
      ["Date", "Revenue", "COGS", "Gross Profit"],
      ...chartData.map(d => [d.day, (d.revenue / 100).toFixed(2), (d.cost / 100).toFixed(2), (d.profit / 100).toFixed(2)]),
      [], ["Financial Summary"],
      ["Total Revenue", (totalRevenue / 100).toFixed(2)],
      ["Total COGS", (totalCOGS / 100).toFixed(2)],
      ["Gross Profit", (grossProfit / 100).toFixed(2)],
      ["Gross Margin %", grossMargin],
      [`${salesTaxName} Estimate (${(Number(salesTaxRate) * 100).toFixed(1)}%)`, (estimatedSalesTax / 100).toFixed(2)],
      ["Net Revenue", (netRevenue / 100).toFixed(2)],
      ["Total Expenses", (totalExpenses / 100).toFixed(2)],
      ["Operating Profit", (operatingProfit / 100).toFixed(2)],
      [`${incomeTaxName} Estimate (${(Number(incomeTaxRate) * 100).toFixed(1)}%)`, (estimatedIncomeTax / 100).toFixed(2)],
      ["Net Profit (after tax)", (netProfit / 100).toFixed(2)],
      [], ["Expenses by Category"],
      ...Object.entries(expByCat).map(([cat, amt]) => [cat, ((amt as number) / 100).toFixed(2)]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `stokivo-accounting-${period}days.csv`; a.click();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Accounting"
        subtitle={`Financial overview with auto ${salesTaxName} (${country})`}
        actions={
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" /> Export</Button>
          </div>
        }
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview"><TrendingUp className="h-4 w-4 mr-1.5" />Overview</TabsTrigger>
          <TabsTrigger value="expenses"><Receipt className="h-4 w-4 mr-1.5" />Expenses</TabsTrigger>
          <TabsTrigger value="cashflow"><Wallet className="h-4 w-4 mr-1.5" />Cash Flow</TabsTrigger>
          <TabsTrigger value="tax"><FileText className="h-4 w-4 mr-1.5" />Tax</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-accent" /></div>
                <div><p className="text-xs text-muted-foreground">Revenue</p><p className="text-xl font-display font-bold">{formatMoney(totalRevenue, currency)}</p></div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center"><ArrowDownRight className="h-5 w-5 text-destructive" /></div>
                <div><p className="text-xs text-muted-foreground">COGS</p><p className="text-xl font-display font-bold">{formatMoney(totalCOGS, currency)}</p></div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-success" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Net Profit</p>
                  <p className={`text-xl font-display font-bold ${netProfit >= 0 ? "text-success" : "text-destructive"}`}>{formatMoney(netProfit, currency)}</p>
                  <p className="text-[11px] text-muted-foreground">{grossMargin}% margin</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center"><Package className="h-5 w-5 text-muted-foreground" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Inventory</p>
                  <p className="text-xl font-display font-bold">{formatMoney(inventoryValue, currency)}</p>
                  <p className="text-[11px] text-muted-foreground">Retail: {formatMoney(retailValue, currency)}</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-4 sm:p-5">
            <h3 className="font-display font-semibold mb-4">Revenue vs Cost of Goods</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,90%)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(215,15%,50%)" interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(215,15%,50%)" tickFormatter={v => formatMoney(v, currency)} width={65} />
                  <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(170,60%,40%)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="cost" name="COGS" fill="hsl(0,72%,51%)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="profit" name="Profit" fill="hsl(142,60%,40%)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">No sales data</div>}
          </Card>

          <Card className="p-5">
            <h3 className="font-display font-semibold mb-4">Top Products by Profit</h3>
            {topProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Product</th><th className="pb-2 font-medium text-right">Qty</th><th className="pb-2 font-medium text-right">Revenue</th><th className="pb-2 font-medium text-right">COGS</th><th className="pb-2 font-medium text-right">Profit</th><th className="pb-2 font-medium text-right">Margin</th>
                  </tr></thead>
                  <tbody>{topProducts.map(p => {
                    const m = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={p.name} className="border-b last:border-0">
                        <td className="py-2.5 font-medium">{p.name}</td>
                        <td className="py-2.5 text-right text-muted-foreground">{p.qty}</td>
                        <td className="py-2.5 text-right">{formatMoney(p.revenue, currency)}</td>
                        <td className="py-2.5 text-right text-muted-foreground">{formatMoney(p.cost, currency)}</td>
                        <td className={`py-2.5 text-right font-semibold ${p.profit >= 0 ? "text-success" : "text-destructive"}`}>{formatMoney(p.profit, currency)}</td>
                        <td className="py-2.5 text-right text-muted-foreground">{m}%</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No sales data</p>}
          </Card>
        </TabsContent>

        {/* EXPENSES TAB */}
        <TabsContent value="expenses" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold text-lg">Expenses</h3>
              <p className="text-sm text-muted-foreground">Total: {formatMoney(totalExpenses, currency)}</p>
            </div>
            <Button onClick={() => setAddExpenseOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Expense</Button>
          </div>

          {Object.keys(expByCat).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(expByCat).sort(([, a], [, b]) => (b as number) - (a as number)).map(([cat, amt]) => (
                <Card key={cat} className="p-4">
                  <p className="text-xs text-muted-foreground">{cat}</p>
                  <p className="text-lg font-display font-bold mt-1">{formatMoney(amt as number, currency)}</p>
                </Card>
              ))}
            </div>
          )}

          <Card className="p-5">
            {expenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">Category</th><th className="pb-2 font-medium">Description</th><th className="pb-2 font-medium text-right">Amount</th><th className="pb-2 w-10"></th>
                  </tr></thead>
                  <tbody>{expenses.map((e: any) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-2.5">{new Date(e.expense_date).toLocaleDateString()}</td>
                      <td className="py-2.5">{e.category}</td>
                      <td className="py-2.5 text-muted-foreground">{e.description || "—"}</td>
                      <td className="py-2.5 text-right font-semibold">{formatMoney(e.amount, currency)}</td>
                      <td className="py-2.5"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteExpense(e.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No expenses recorded</p>}
          </Card>
        </TabsContent>

        {/* CASH FLOW TAB */}
        <TabsContent value="cashflow" className="space-y-6">
          <h3 className="font-display font-semibold text-lg">Cash Flow Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 space-y-3">
              <h4 className="font-semibold text-success flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Inflows</h4>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Gross Revenue</span><span className="font-semibold">{formatMoney(totalRevenue, currency)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{salesTaxName} ({(Number(salesTaxRate) * 100).toFixed(1)}%)</span><span className="text-destructive">-{formatMoney(estimatedSalesTax, currency)}</span></div>
              <div className="border-t pt-2 flex justify-between text-sm"><span className="font-medium">Net Revenue</span><span className="font-bold">{formatMoney(netRevenue, currency)}</span></div>
            </Card>
            <Card className="p-5 space-y-3">
              <h4 className="font-semibold text-destructive flex items-center gap-2"><TrendingDown className="h-4 w-4" /> Outflows</h4>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cost of Goods</span><span className="font-semibold">{formatMoney(totalCOGS, currency)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Expenses</span><span className="font-semibold">{formatMoney(totalExpenses, currency)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{incomeTaxName} Est.</span><span className="font-semibold">{formatMoney(estimatedIncomeTax, currency)}</span></div>
              <div className="border-t pt-2 flex justify-between text-sm"><span className="font-medium">Total Outflows</span><span className="font-bold">{formatMoney(totalCOGS + totalExpenses + estimatedIncomeTax, currency)}</span></div>
            </Card>
          </div>
          <Card className="p-5">
            <div className="flex justify-between items-center">
              <span className="font-display font-semibold text-lg">Net Cash Position</span>
              <span className={`text-2xl font-display font-bold ${netProfit >= 0 ? "text-success" : "text-destructive"}`}>{formatMoney(netProfit, currency)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Estimated after all deductions including {salesTaxName} and {incomeTaxName}</p>
          </Card>
        </TabsContent>

        {/* TAX TAB */}
        <TabsContent value="tax" className="space-y-6">
          <h3 className="font-display font-semibold text-lg">Tax Estimates ({country})</h3>
          <p className="text-sm text-muted-foreground -mt-4">These are estimates only — not for filing. Consult your accountant for compliance.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 space-y-3">
              <h4 className="font-semibold">{salesTaxName} ({(Number(salesTaxRate) * 100).toFixed(1)}%)</h4>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Gross Revenue</span><span>{formatMoney(totalRevenue, currency)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Estimated {salesTaxName}</span><span className="text-destructive font-semibold">{formatMoney(estimatedSalesTax, currency)}</span></div>
              <div className="border-t pt-2 flex justify-between text-sm"><span className="font-medium">Net Revenue</span><span className="font-bold">{formatMoney(netRevenue, currency)}</span></div>
            </Card>
            <Card className="p-5 space-y-3">
              <h4 className="font-semibold">{incomeTaxName} ({(Number(incomeTaxRate) * 100).toFixed(1)}%)</h4>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Operating Profit</span><span>{formatMoney(operatingProfit, currency)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Estimated {incomeTaxName}</span><span className="text-destructive font-semibold">{formatMoney(estimatedIncomeTax, currency)}</span></div>
              <div className="border-t pt-2 flex justify-between text-sm"><span className="font-medium">Net Profit</span><span className={`font-bold ${netProfit >= 0 ? "text-success" : "text-destructive"}`}>{formatMoney(netProfit, currency)}</span></div>
            </Card>
          </div>

          <Card className="p-5 bg-muted/30">
            <h4 className="font-semibold mb-3">Profit & Loss Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Revenue</span><span className="font-semibold">{formatMoney(totalRevenue, currency)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>− Cost of Goods Sold</span><span>{formatMoney(totalCOGS, currency)}</span></div>
              <div className="flex justify-between border-t pt-1"><span className="font-medium">Gross Profit</span><span className="font-semibold">{formatMoney(grossProfit, currency)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>− Expenses</span><span>{formatMoney(totalExpenses, currency)}</span></div>
              <div className="flex justify-between border-t pt-1"><span className="font-medium">Operating Profit</span><span className="font-semibold">{formatMoney(operatingProfit, currency)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>− {salesTaxName}</span><span>{formatMoney(estimatedSalesTax, currency)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>− {incomeTaxName}</span><span>{formatMoney(estimatedIncomeTax, currency)}</span></div>
              <div className="flex justify-between border-t pt-1 text-base"><span className="font-display font-bold">Net Profit</span><span className={`font-display font-bold ${netProfit >= 0 ? "text-success" : "text-destructive"}`}>{formatMoney(netProfit, currency)}</span></div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Expense Dialog */}
      <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Amount *</Label><Input type="number" step="0.01" placeholder="0.00" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div><Label>Category</Label>
              <Select value={expenseForm.category} onValueChange={v => setExpenseForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={expenseForm.expense_date} onChange={e => setExpenseForm(f => ({ ...f, expense_date: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea placeholder="Optional note..." value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleAddExpense} disabled={saving || !expenseForm.amount}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add Expense</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
