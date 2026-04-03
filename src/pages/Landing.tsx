import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Package, BarChart3, Bell, Users, ShoppingCart, Play,
  CheckCircle2, ArrowRight, Star, Truck, Globe, Smartphone,
  ShieldCheck, Zap, TrendingUp, Clock, Brain, Warehouse, Lock,
} from "lucide-react";
import stokivoLogo from "@/assets/stokivo-logo.png";
import { useState } from "react";

const features = [
  { icon: Package, title: "Real-Time Stock Tracking", desc: "Always know what's in stock, what's running low, and what needs reordering." },
  { icon: ShoppingCart, title: "Easy In & Out Management", desc: "Record stock movements with just a few taps — fast and error-free." },
  { icon: BarChart3, title: "Smart Reports & Analytics", desc: "Get insights into sales trends, profit margins, and top-selling products." },
  { icon: Bell, title: "Low Stock Alerts", desc: "Get notified before you run out. Never miss a sale due to stockouts." },
  { icon: Users, title: "Multi-User & Multi-Location", desc: "Manage staff access and track inventory across multiple locations." },
];

const benefits = [
  "Know what you have, what's running low, and what to reorder.",
  "Avoid overstocking and stockouts.",
  "Work faster with a simple, mobile-friendly app.",
  "Get insights that help you grow profitably.",
];

const channels = [
  { name: "Instagram Shop", icon: Globe },
  { name: "TikTok Shop", icon: Smartphone },
  { name: "Amazon", icon: ShoppingCart },
  { name: "eBay", icon: ShoppingCart },
  { name: "Etsy", icon: Star },
  { name: "Deliveroo", icon: Truck },
  { name: "Uber Eats", icon: Truck },
];

const trustedBy = [
  "Bright Supplies Ltd", "Northpoint Traders", "MC Electronics", "Prime Retailers", "Swift Distributors",
];

const plans = [
  {
    name: "Starter",
    color: "bg-accent",
    colorText: "text-accent",
    borderColor: "border-accent/20",
    monthly: 19,
    annual: 15,
    highlight: false,
    cta: "Get Started",
    features: [
      "Up to 2 users",
      "500 products",
      "Real-time stock tracking",
      "Order management (basic)",
      "Low stock alerts",
      "Stock movement tracking (basic)",
      "Basic reports",
      "Email support",
    ],
  },
  {
    name: "Growth",
    color: "bg-primary",
    colorText: "text-primary",
    borderColor: "border-primary/30",
    monthly: 39,
    annual: 31,
    highlight: true,
    cta: "Start Growth",
    features: [
      "Everything in Starter",
      "Unlimited products",
      "Multi-location inventory",
      "Full stock movement tracking",
      "Expiry product alerts",
      "Smart reorder suggestions",
      "Barcode scanning",
      "Advanced analytics",
      "API access",
      "Basic AI insights",
      "Up to 8 users",
      "Priority support",
    ],
  },
  {
    name: "Pro",
    color: "bg-destructive",
    colorText: "text-destructive",
    borderColor: "border-destructive/20",
    monthly: 79,
    annual: 63,
    highlight: false,
    cta: "Go Pro",
    features: [
      "Everything in Growth",
      "Unlimited users",
      "Multi-warehouse management",
      "AI forecasting engine",
      "Advanced automation workflows",
      "Credit ledger automation",
      "Fully automated smart reordering",
      "Role-based access control",
      "Full integrations",
      "Custom dashboards",
      "Dedicated support",
    ],
  },
];

export default function Landing() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-2.5">
            <img src={stokivoLogo} alt="Stokivo" className="h-8 w-8 sm:h-9 sm:w-9" />
            <div>
              <span className="font-display font-bold text-lg sm:text-xl text-foreground">Stokivo</span>
              <span className="hidden sm:block text-[10px] text-muted-foreground uppercase tracking-widest leading-none">Smart Stock. Strong Business.</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#channels" className="hover:text-foreground transition-colors">Channels</a>
            <Link to="/login" className="hover:text-foreground transition-colors">Login</Link>
          </div>
          <Link to="/register">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-full px-4 sm:px-6 text-sm">
              Get Started Free
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-24 lg:pb-28">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 border border-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6">
              <Zap className="h-3.5 w-3.5" /> INVENTORY MANAGEMENT MADE SIMPLE
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground leading-[1.1]">
              Take Control of Your Stock.{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Grow Your Business.
              </span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-4 sm:mt-6 max-w-lg">
              Stokivo is the all-in-one stock inventory app built for SMEs. Track, manage and optimize your inventory in real-time — save time, cut costs, and never run out of stock again.
            </p>
            <div className="flex flex-wrap gap-3 mt-6 sm:mt-8">
              <Link to="/register">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 sm:px-8 h-11 sm:h-12 font-semibold gap-2">
                  Start Free 14-Day Trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="rounded-full px-6 sm:px-8 h-11 sm:h-12 gap-2">
                <Play className="h-4 w-4" /> See How It Works
              </Button>
            </div>
            <div className="flex flex-wrap gap-4 sm:gap-6 mt-5 sm:mt-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-accent" /> No Credit Card Required</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-accent" /> Quick Setup</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-accent" /> Cancel Anytime</span>
            </div>
          </div>
          {/* Hero visual */}
          <div className="relative hidden lg:block">
            <div className="rounded-2xl bg-card border shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <img src={stokivoLogo} alt="" className="h-7 w-7" />
                <span className="font-display font-bold text-sm">Dashboard</span>
                <div className="ml-auto flex gap-2">
                  <div className="h-3 w-3 rounded-full bg-destructive/40" />
                  <div className="h-3 w-3 rounded-full bg-warning/40" />
                  <div className="h-3 w-3 rounded-full bg-accent/40" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Stock Value", value: "£24,680", change: "+12.5%" },
                  { label: "Low Stock Items", value: "18", change: "3 critical" },
                  { label: "Orders Pending", value: "6", change: "New" },
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-xl bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
                    <p className="text-lg font-bold text-foreground mt-0.5">{kpi.value}</p>
                    <span className="text-[10px] text-accent font-medium">{kpi.change}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-muted/30 p-4 h-32 flex items-end gap-1">
                {[40, 55, 35, 65, 50, 70, 60, 80, 45, 75, 55, 90].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-primary/20" style={{ height: `${h}%` }}>
                    <div className="w-full rounded-t bg-primary" style={{ height: `${Math.min(100, h + 20)}%` }} />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">Top Selling Products</p>
                {["Wireless Mouse — 320 units", "USB-C Cable — 210 units", "Notebook A5 — 158 units"].map((item) => (
                  <div key={item} className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{item.split(" — ")[0]}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.random() * 40 + 50}%` }} />
                      </div>
                      <span className="text-foreground font-medium">{item.split(" — ")[1]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 w-48 rounded-xl bg-card border shadow-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <img src={stokivoLogo} alt="" className="h-5 w-5" />
                <span className="text-[10px] font-bold">Stokivo</span>
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <p className="text-[9px] text-muted-foreground">Current Stock Value</p>
                <p className="text-sm font-bold text-foreground">£24,680 <span className="text-[10px] text-accent">↑ 12.5%</span></p>
              </div>
              <div>
                <p className="text-[9px] font-semibold text-foreground flex items-center gap-1">
                  <Bell className="h-2.5 w-2.5 text-destructive" /> Low Stock Alerts
                </p>
                {["USB-C Cable — 5 units left", "Notebook A5 — 8 units left"].map((a) => (
                  <p key={a} className="text-[9px] text-muted-foreground mt-0.5">{a}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features bar */}
      <section id="features" className="bg-primary text-primary-foreground py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 sm:gap-8">
            {features.map((f) => (
              <div key={f.title} className="text-center space-y-2 sm:space-y-3">
                <div className="h-12 w-12 sm:h-14 sm:w-14 mx-auto rounded-2xl bg-primary-foreground/10 flex items-center justify-center">
                  <f.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <p className="text-xs sm:text-sm font-semibold">{f.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Simple, Transparent Pricing</h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm sm:text-base">Choose the plan that fits your business. Upgrade anytime as you grow.</p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={`text-sm font-medium ${!annual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative h-7 w-12 rounded-full transition-colors ${annual ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${annual ? "translate-x-[22px]" : "translate-x-0.5"}`} />
            </button>
            <span className={`text-sm font-medium ${annual ? "text-foreground" : "text-muted-foreground"}`}>Annual <span className="text-accent text-xs font-semibold">Save 20%</span></span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border-2 p-5 sm:p-7 flex flex-col ${
                plan.highlight
                  ? "border-primary bg-primary/[0.02] shadow-xl scale-[1.02] sm:scale-105"
                  : `${plan.borderColor} bg-card`
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                    <Star className="h-3 w-3" /> Most Popular
                  </span>
                </div>
              )}
              <div className="mb-4 sm:mb-6">
                <h3 className={`text-lg font-display font-bold ${plan.colorText}`}>{plan.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl sm:text-4xl font-display font-bold text-foreground">£{annual ? plan.annual : plan.monthly}</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
                {annual && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="line-through">£{plan.monthly}/month</span> billed annually
                  </p>
                )}
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                    <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${plan.colorText}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="block">
                <Button
                  className={`w-full rounded-full font-semibold h-10 sm:h-11 ${
                    plan.highlight
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-card border-2 border-current hover:bg-muted/50"
                  }`}
                  variant={plan.highlight ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits + Testimonial + CTA */}
      <section id="testimonial" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="rounded-2xl bg-muted/50 border p-6 sm:p-8">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">Built for SMEs</p>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground leading-tight">
              Save Time. Reduce Costs. Make Smarter Decisions.
            </h2>
            <ul className="mt-5 sm:mt-6 space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-muted/50 border p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <span className="text-4xl text-primary/30 font-serif">"</span>
              <p className="text-base italic text-foreground leading-relaxed -mt-4">
                "Stokivo has completely transformed how we manage inventory. We save hours every week and our stock accuracy is now 99%!"
              </p>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">AK</div>
              <div>
                <p className="text-sm font-semibold text-foreground">Ahmed Khan</p>
                <p className="text-xs text-muted-foreground">Director, Bright Supplies Ltd</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-primary text-primary-foreground p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-xl sm:text-2xl font-display font-bold leading-tight">
                Ready to Gain Full Control of Your Stock?
              </h3>
              <p className="text-primary-foreground/70 text-sm mt-3">
                Join hundreds of SMEs who trust Stokivo to run their business smarter and faster.
              </p>
            </div>
            <div className="mt-6">
              <Link to="/register">
                <Button size="lg" variant="secondary" className="w-full rounded-full font-semibold h-11 sm:h-12">
                  Start Your Free Trial
                </Button>
              </Link>
              <p className="text-[11px] text-primary-foreground/50 text-center mt-3">No credit card • 14 days free • Setup in minutes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-channel */}
      <section id="channels" className="bg-muted/30 border-y py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Sell Everywhere. Manage in One Place.</h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm sm:text-base">
            Stokivo syncs your inventory across POS, online store, and delivery platforms — no double-counting, no overselling.
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-8 sm:mt-10">
            {channels.map((ch) => (
              <div key={ch.name} className="flex items-center gap-2 rounded-full bg-card border px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-foreground shadow-sm">
                <ch.icon className="h-4 w-4 text-primary" />
                {ch.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trusted by */}
      <section className="py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-6">
            Trusted by SMEs across the UK
          </p>
          <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
            {trustedBy.map((name) => (
              <div key={name} className="flex items-center gap-2 text-muted-foreground/60">
                <Package className="h-5 w-5" />
                <span className="text-xs sm:text-sm font-medium">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={stokivoLogo} alt="Stokivo" className="h-6 w-6" />
            <span className="font-display font-bold text-sm">Stokivo</span>
            <span className="text-[10px] text-muted-foreground">Smart Stock. Strong Business.</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Stokivo. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
