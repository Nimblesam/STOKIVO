import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminIntegrations() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: comps } = await supabase.from("companies").select("id, name, stripe_account_id, country").order("name");
      setCompanies(comps || []);
      const { data: wh } = await supabase.from("webhook_events").select("*").order("created_at", { ascending: false }).limit(100);
      setWebhooks(wh || []);
    };
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Payment Integrations</h1>
      <Tabs defaultValue="status">
        <TabsList>
          <TabsTrigger value="status">Integration Status</TabsTrigger>
          <TabsTrigger value="webhooks">Webhook Events</TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Stripe Connect</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.country}</TableCell>
                    <TableCell>
                      <Badge variant={c.stripe_account_id ? "default" : "secondary"}>
                        {c.stripe_account_id ? "Connected" : "Not Connected"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="webhooks">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No webhook events yet</TableCell></TableRow>
                ) : webhooks.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>{w.provider}</TableCell>
                    <TableCell className="text-xs font-mono">{w.event_type}</TableCell>
                    <TableCell><Badge variant={w.status === "processed" ? "default" : "destructive"}>{w.status}</Badge></TableCell>
                    <TableCell className="text-xs text-destructive max-w-[200px] truncate">{w.error_message || "—"}</TableCell>
                    <TableCell className="text-xs">{new Date(w.created_at).toLocaleString()}</TableCell>
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
