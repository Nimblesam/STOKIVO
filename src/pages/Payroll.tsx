import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatMoney } from "@/lib/currency";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Users, Clock, Calculator, Download, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Currency } from "@/lib/types";

export default function Payroll() {
  const { profile, company } = useAuth();
  const currency = (company?.currency || "GBP") as Currency;
  const country = company?.country || "UK";
  const cid = profile?.company_id;

  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [taxRates, setTaxRates] = useState<any[]>([]);

  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: "", pay_type: "fixed", hourly_rate: "", fixed_salary: "" });
  const [addLogOpen, setAddLogOpen] = useState(false);
  const [logForm, setLogForm] = useState({ staff_id: "", hours_worked: "", work_date: new Date().toISOString().slice(0, 10), notes: "" });
  const [runPayrollOpen, setRunPayrollOpen] = useState(false);
  const [payrollForm, setPayrollForm] = useState({ staff_id: "", period_start: "", period_end: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  const fetchData = () => {
    if (!cid) return;
    setLoading(true);
    Promise.all([
      supabase.from("staff").select("*").eq("company_id", cid).order("name"),
      supabase.from("work_logs").select("*").eq("company_id", cid).order("work_date", { ascending: false }).limit(100),
      supabase.from("payroll_runs").select("*, staff(name)").eq("company_id", cid).order("created_at", { ascending: false }).limit(50),
      supabase.from("tax_rates").select("*"),
    ]).then(([sRes, wRes, pRes, tRes]) => {
      setStaff(sRes.data || []);
      setWorkLogs(wRes.data || []);
      setPayrollRuns(pRes.data || []);
      setTaxRates(tRes.data || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, [cid]);

  const incomeTaxRate = useMemo(() => Number(taxRates.find(t => t.country === country && t.tax_type === "income")?.rate || 0), [taxRates, country]);
  const incomeTaxName = useMemo(() => taxRates.find(t => t.country === country && t.tax_type === "income")?.name || "Income Tax", [taxRates, country]);

  const activeStaff = staff.filter(s => s.active);
  const staffMap = new Map(staff.map(s => [s.id, s]));

  const handleAddStaff = async () => {
    if (!cid || !staffForm.name) return;
    setSaving(true);
    const { error } = await supabase.from("staff").insert({
      company_id: cid,
      name: staffForm.name,
      pay_type: staffForm.pay_type,
      hourly_rate: staffForm.pay_type === "hourly" ? Math.round(parseFloat(staffForm.hourly_rate || "0") * 100) : 0,
      fixed_salary: staffForm.pay_type === "fixed" ? Math.round(parseFloat(staffForm.fixed_salary || "0") * 100) : 0,
    } as any);
    setSaving(false);
    if (error) { toast.error("Failed to add staff"); return; }
    toast.success("Staff added");
    setAddStaffOpen(false);
    setStaffForm({ name: "", pay_type: "fixed", hourly_rate: "", fixed_salary: "" });
    fetchData();
  };

  const handleAddLog = async () => {
    if (!cid || !logForm.staff_id || !logForm.hours_worked) return;
    setSaving(true);
    const { error } = await supabase.from("work_logs").insert({
      company_id: cid,
      staff_id: logForm.staff_id,
      hours_worked: parseFloat(logForm.hours_worked),
      work_date: logForm.work_date,
      notes: logForm.notes || null,
    } as any);
    setSaving(false);
    if (error) { toast.error("Failed to log hours"); return; }
    toast.success("Hours logged");
    setAddLogOpen(false);
    setLogForm({ staff_id: "", hours_worked: "", work_date: new Date().toISOString().slice(0, 10), notes: "" });
    fetchData();
  };

  const handleRunPayroll = async () => {
    if (!cid || !payrollForm.staff_id || !payrollForm.period_start || !payrollForm.period_end) return;
    const s = staffMap.get(payrollForm.staff_id);
    if (!s) return;
    setSaving(true);

    let basePay = 0;
    if (s.pay_type === "fixed") {
      basePay = s.fixed_salary;
    } else {
      const { data: logs } = await supabase.from("work_logs").select("hours_worked")
        .eq("staff_id", s.id).eq("company_id", cid)
        .gte("work_date", payrollForm.period_start).lte("work_date", payrollForm.period_end);
      const totalHours = (logs || []).reduce((sum: number, l: any) => sum + Number(l.hours_worked), 0);
      basePay = Math.round(totalHours * s.hourly_rate);
    }

    const estimatedTax = Math.round(basePay * incomeTaxRate);
    const netPay = basePay - estimatedTax;

    const { error } = await supabase.from("payroll_runs").insert({
      company_id: cid,
      staff_id: s.id,
      period_start: payrollForm.period_start,
      period_end: payrollForm.period_end,
      base_pay: basePay,
      estimated_tax: estimatedTax,
      net_pay: netPay,
    } as any);

    setSaving(false);
    if (error) { toast.error("Failed to run payroll"); return; }
    toast.success("Payroll calculated");
    setRunPayrollOpen(false);
    setPayrollForm({ staff_id: "", period_start: "", period_end: new Date().toISOString().slice(0, 10) });
    fetchData();
  };

  const markPaid = async (id: string) => {
    await supabase.from("payroll_runs").update({ status: "paid", paid_at: new Date().toISOString() } as any).eq("id", id);
    toast.success("Marked as paid");
    fetchData();
  };

  const exportPayroll = () => {
    const rows = [
      ["Staff", "Period", "Base Pay", `Est. ${incomeTaxName}`, "Net Pay", "Status"],
      ...payrollRuns.map((r: any) => [
        r.staff?.name || "—", `${r.period_start} to ${r.period_end}`,
        (r.base_pay / 100).toFixed(2), (r.estimated_tax / 100).toFixed(2),
        (r.net_pay / 100).toFixed(2), r.status,
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "stokivo-payroll.csv"; a.click();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Payroll"
        subtitle={`Staff management & payroll with ${incomeTaxName} estimates`}
        actions={<Button variant="outline" onClick={exportPayroll}><Download className="h-4 w-4 mr-2" />Export</Button>}
      />

      <Tabs defaultValue="staff" className="space-y-6">
        <TabsList>
          <TabsTrigger value="staff"><Users className="h-4 w-4 mr-1.5" />Staff</TabsTrigger>
          <TabsTrigger value="logs"><Clock className="h-4 w-4 mr-1.5" />Work Logs</TabsTrigger>
          <TabsTrigger value="payroll"><Calculator className="h-4 w-4 mr-1.5" />Payroll Runs</TabsTrigger>
        </TabsList>

        {/* STAFF TAB */}
        <TabsContent value="staff" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold">Staff ({activeStaff.length})</h3>
            <Button onClick={() => setAddStaffOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Staff</Button>
          </div>
          {activeStaff.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeStaff.map(s => (
                <Card key={s.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{s.name}</span>
                    <Badge variant="secondary">{s.pay_type === "hourly" ? "Hourly" : "Fixed"}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {s.pay_type === "hourly"
                      ? `${formatMoney(s.hourly_rate, currency)}/hr`
                      : `${formatMoney(s.fixed_salary, currency)}/month`}
                  </p>
                </Card>
              ))}
            </div>
          ) : <Card className="p-8 text-center text-sm text-muted-foreground">No staff added yet</Card>}
        </TabsContent>

        {/* WORK LOGS TAB */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold">Work Logs</h3>
            <Button onClick={() => setAddLogOpen(true)} disabled={staff.filter(s => s.pay_type === "hourly").length === 0}>
              <Plus className="h-4 w-4 mr-2" />Log Hours
            </Button>
          </div>
          <Card className="p-5">
            {workLogs.length > 0 ? (
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">Staff</th><th className="pb-2 font-medium text-right">Hours</th><th className="pb-2 font-medium">Notes</th>
                </tr></thead>
                <tbody>{workLogs.map(l => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2.5">{new Date(l.work_date).toLocaleDateString()}</td>
                    <td className="py-2.5">{staffMap.get(l.staff_id)?.name || "—"}</td>
                    <td className="py-2.5 text-right font-semibold">{Number(l.hours_worked).toFixed(1)}</td>
                    <td className="py-2.5 text-muted-foreground">{l.notes || "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No work logs yet</p>}
          </Card>
        </TabsContent>

        {/* PAYROLL RUNS TAB */}
        <TabsContent value="payroll" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold">Payroll Runs</h3>
            <Button onClick={() => setRunPayrollOpen(true)} disabled={activeStaff.length === 0}>
              <Calculator className="h-4 w-4 mr-2" />Run Payroll
            </Button>
          </div>
          <Card className="p-5">
            {payrollRuns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Staff</th><th className="pb-2 font-medium">Period</th><th className="pb-2 font-medium text-right">Base Pay</th><th className="pb-2 font-medium text-right">Est. Tax</th><th className="pb-2 font-medium text-right">Net Pay</th><th className="pb-2 font-medium text-center">Status</th><th className="pb-2 w-10"></th>
                  </tr></thead>
                  <tbody>{payrollRuns.map((r: any) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2.5 font-medium">{r.staff?.name || "—"}</td>
                      <td className="py-2.5 text-muted-foreground text-xs">{r.period_start} → {r.period_end}</td>
                      <td className="py-2.5 text-right">{formatMoney(r.base_pay, currency)}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{formatMoney(r.estimated_tax, currency)}</td>
                      <td className="py-2.5 text-right font-semibold">{formatMoney(r.net_pay, currency)}</td>
                      <td className="py-2.5 text-center">
                        <Badge variant={r.status === "paid" ? "default" : "secondary"}>{r.status}</Badge>
                      </td>
                      <td className="py-2.5">
                        {r.status === "draft" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markPaid(r.id)}>
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No payroll runs yet</p>}
          </Card>
          <p className="text-xs text-muted-foreground">⚠️ Tax estimates are approximate ({incomeTaxName} @ {(incomeTaxRate * 100).toFixed(1)}%). Not for compliance — consult your accountant.</p>
        </TabsContent>
      </Tabs>

      {/* Add Staff Dialog */}
      <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={staffForm.name} onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Pay Type</Label>
              <Select value={staffForm.pay_type} onValueChange={v => setStaffForm(f => ({ ...f, pay_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Salary</SelectItem>
                  <SelectItem value="hourly">Hourly Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {staffForm.pay_type === "hourly" ? (
              <div><Label>Hourly Rate</Label><Input type="number" step="0.01" placeholder="0.00" value={staffForm.hourly_rate} onChange={e => setStaffForm(f => ({ ...f, hourly_rate: e.target.value }))} /></div>
            ) : (
              <div><Label>Monthly Salary</Label><Input type="number" step="0.01" placeholder="0.00" value={staffForm.fixed_salary} onChange={e => setStaffForm(f => ({ ...f, fixed_salary: e.target.value }))} /></div>
            )}
          </div>
          <DialogFooter><Button onClick={handleAddStaff} disabled={saving || !staffForm.name}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add Staff</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Hours Dialog */}
      <Dialog open={addLogOpen} onOpenChange={setAddLogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Work Hours</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Staff Member *</Label>
              <Select value={logForm.staff_id} onValueChange={v => setLogForm(f => ({ ...f, staff_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>{staff.filter(s => s.pay_type === "hourly" && s.active).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Hours Worked *</Label><Input type="number" step="0.5" value={logForm.hours_worked} onChange={e => setLogForm(f => ({ ...f, hours_worked: e.target.value }))} /></div>
            <div><Label>Date</Label><Input type="date" value={logForm.work_date} onChange={e => setLogForm(f => ({ ...f, work_date: e.target.value }))} /></div>
            <div><Label>Notes</Label><Input value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleAddLog} disabled={saving || !logForm.staff_id || !logForm.hours_worked}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Log Hours</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run Payroll Dialog */}
      <Dialog open={runPayrollOpen} onOpenChange={setRunPayrollOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Run Payroll</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Staff Member *</Label>
              <Select value={payrollForm.staff_id} onValueChange={v => setPayrollForm(f => ({ ...f, staff_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>{activeStaff.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.pay_type})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Period Start *</Label><Input type="date" value={payrollForm.period_start} onChange={e => setPayrollForm(f => ({ ...f, period_start: e.target.value }))} /></div>
            <div><Label>Period End *</Label><Input type="date" value={payrollForm.period_end} onChange={e => setPayrollForm(f => ({ ...f, period_end: e.target.value }))} /></div>
            {payrollForm.staff_id && (
              <Card className="p-3 bg-muted/30 text-sm">
                <p className="text-muted-foreground">Tax rate: {incomeTaxName} @ {(incomeTaxRate * 100).toFixed(1)}%</p>
                <p className="text-muted-foreground mt-1">
                  {staffMap.get(payrollForm.staff_id)?.pay_type === "hourly"
                    ? "Will calculate from logged hours × hourly rate"
                    : `Fixed salary: ${formatMoney(staffMap.get(payrollForm.staff_id)?.fixed_salary || 0, currency)}`}
                </p>
              </Card>
            )}
          </div>
          <DialogFooter><Button onClick={handleRunPayroll} disabled={saving || !payrollForm.staff_id || !payrollForm.period_start}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Calculate Payroll</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
