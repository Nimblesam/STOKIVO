import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Globe, Smartphone, ShoppingCart, Star, Truck, Monitor,
  Link2, CheckCircle2, Clock, ArrowRight,
} from "lucide-react";

const channels = [
  { name: "POS (In-Store)", icon: Monitor, status: "active" as const, desc: "Cashier & barcode scanning built-in" },
  { name: "Online Store", icon: Globe, status: "active" as const, desc: "Your products synced to your web store" },
  { name: "Instagram Shop", icon: Globe, status: "coming_soon" as const, desc: "List products directly on Instagram" },
  { name: "TikTok Shop", icon: Smartphone, status: "coming_soon" as const, desc: "Sell through TikTok's marketplace" },
  { name: "Amazon", icon: ShoppingCart, status: "coming_soon" as const, desc: "Sync inventory with Amazon listings" },
  { name: "eBay", icon: ShoppingCart, status: "coming_soon" as const, desc: "Keep eBay stock levels accurate" },
  { name: "Etsy", icon: Star, status: "coming_soon" as const, desc: "Handmade & vintage marketplace sync" },
  { name: "Deliveroo", icon: Truck, status: "coming_soon" as const, desc: "Restaurant & grocery delivery sync" },
  { name: "Uber Eats", icon: Truck, status: "coming_soon" as const, desc: "Food delivery inventory management" },
];

export default function Integrations() {
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Integrations"
        subtitle="Connect your sales channels — inventory syncs automatically"
      />

      <div className="zentra-card p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Link2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Multi-Channel Sync</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Stokivo automatically syncs your inventory across all connected channels. 
              No double-counting, no overselling. Every sale updates stock in real-time.
            </p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map((ch) => (
          <div key={ch.name} className="zentra-card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <ch.icon className="h-5 w-5 text-foreground" />
                </div>
                {ch.status === "active" ? (
                  <Badge className="bg-accent/10 text-accent border-accent/20 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" /> Coming Soon
                  </Badge>
                )}
              </div>
              <h4 className="font-semibold text-foreground text-sm">{ch.name}</h4>
              <p className="text-xs text-muted-foreground mt-1">{ch.desc}</p>
            </div>
            <Button
              variant={ch.status === "active" ? "default" : "outline"}
              size="sm"
              className="mt-4 w-full gap-1"
              disabled={ch.status === "coming_soon"}
            >
              {ch.status === "active" ? (
                <>Connected <CheckCircle2 className="h-3.5 w-3.5" /></>
              ) : (
                <>Notify Me <ArrowRight className="h-3.5 w-3.5" /></>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
