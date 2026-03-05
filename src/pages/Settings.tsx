import { PageHeader } from "@/components/PageHeader";
import { demoCompany, demoUser, PLANS } from "@/lib/demo-data";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, CreditCard, Shield, Check } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

const teamMembers = [
  { name: "Chioma Okafor", email: "admin@mamaafrica.co.uk", role: "owner" as const, active: true },
  { name: "David Eze", email: "david@mamaafrica.co.uk", role: "manager" as const, active: true },
  { name: "Blessing Uche", email: "blessing@mamaafrica.co.uk", role: "staff" as const, active: true },
];

export default function Settings() {
  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Settings" subtitle="Manage your company and account" />

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="company" className="gap-2"><Building2 className="h-4 w-4" /> Company</TabsTrigger>
          <TabsTrigger value="team" className="gap-2"><Users className="h-4 w-4" /> Team</TabsTrigger>
          <TabsTrigger value="billing" className="gap-2"><CreditCard className="h-4 w-4" /> Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <div className="zentra-card p-6 space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-xl bg-accent/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-accent" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-foreground">{demoCompany.name}</h3>
                <p className="text-sm text-muted-foreground">{demoCompany.address}</p>
              </div>
              <Button variant="outline" className="ml-auto">Upload Logo</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Company Name</Label>
                <Input defaultValue={demoCompany.name} className="mt-1" />
              </div>
              <div>
                <Label>Country</Label>
                <Input defaultValue={demoCompany.country} className="mt-1" />
              </div>
              <div>
                <Label>Address</Label>
                <Input defaultValue={demoCompany.address} className="mt-1" />
              </div>
              <div>
                <Label>Currency</Label>
                <Input defaultValue={demoCompany.currency} className="mt-1" />
              </div>
              <div>
                <Label>Brand Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input defaultValue={demoCompany.brandColor} className="flex-1" />
                  <div className="h-10 w-10 rounded-lg border" style={{ backgroundColor: demoCompany.brandColor }} />
                </div>
              </div>
              <div>
                <Label>Business Type</Label>
                <Input defaultValue={demoCompany.businessType} className="mt-1 capitalize" />
              </div>
            </div>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Save Changes</Button>
          </div>
        </TabsContent>

        <TabsContent value="team">
          <div className="zentra-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-semibold text-foreground">Team Members</h3>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                <Users className="h-4 w-4" /> Invite User
              </Button>
            </div>
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.email} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                  <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center text-xs font-semibold text-accent">
                    {member.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground capitalize bg-muted px-2 py-1 rounded">
                    {member.role}
                  </span>
                  <StatusBadge status={member.active ? "active" : "inactive"} />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="billing">
          <div className="space-y-6">
            <div className="zentra-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-5 w-5 text-accent" />
                <div>
                  <h3 className="font-display font-semibold text-foreground">Current Plan: {demoCompany.plan.toUpperCase()}</h3>
                  <p className="text-sm text-muted-foreground">Your plan renews monthly</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map((plan) => (
                <div
                  key={plan.tier}
                  className={`zentra-card p-6 ${plan.tier === demoCompany.plan ? "border-accent border-2" : ""}`}
                >
                  <h4 className="font-display font-bold text-lg text-foreground">{plan.name}</h4>
                  <p className="text-2xl font-display font-bold text-foreground mt-2">
                    {formatMoney(plan.price.GBP)}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full mt-6"
                    variant={plan.tier === demoCompany.plan ? "outline" : "default"}
                    disabled={plan.tier === demoCompany.plan}
                  >
                    {plan.tier === demoCompany.plan ? "Current Plan" : "Upgrade"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
