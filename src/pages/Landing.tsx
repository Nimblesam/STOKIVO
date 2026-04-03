import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Package, BarChart3, Bell, Users, ShoppingCart, Play,
  CheckCircle2, ArrowRight, Star, Truck, Globe, Smartphone,
  ShieldCheck, Zap, TrendingUp, Clock, Brain, Warehouse, Lock,
  ScanBarcode, FileText, CreditCard, Layers, RefreshCw,
  AlertTriangle, PieChart, MapPin, UserCheck,
} from "lucide-react";
import stokivoLogo from "@/assets/stokivo-logo.png";
import { useState } from "react";

const coreFeatures = [
  {
    icon: Package,
    title: "Stock Management",
    desc: "Track every item in real-time across all locations. Know exactly what's on the shelf, what's incoming, and what needs restocking.",
  },
  {
    icon: ShoppingCart,
    title: "Built-in POS System",
    desc: "Process sales, accept card payments via Stripe Terminal, print receipts, and automatically update stock — all from one screen.",
  },
  {
    icon: MapPin,
    title: "Multi-Location & Warehouse",
    desc: "Manage inventory across multiple stores and warehouses. Transfer stock between locations with full audit trails.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    desc: "Understand your best sellers, profit margins, sales trends, and seasonal patterns with visual dashboards.",
  },
  {
    icon: Bell,
    title: "Smart Alerts & Reordering",
    desc: "Get notified before stockouts happen. AI-powered reorder suggestions based on sales velocity and lead times.",
  },
  {
    icon: Brain,
    title: "AI Demand Forecasting",
    desc: "Predict future demand using sales history. See 7-day forecasts, trending products, and slow movers at a glance.",
  },
];

const additionalFeatures = [
  { icon: ScanBarcode, label: "Barcode Scanning" },
  { icon: FileText, label: "Invoicing & Billing" },
  { icon: CreditCard, label: "Stripe Payments" },
  { icon: Users, label: "Team & Role Access" },
  { icon: RefreshCw, label: "Expiry Tracking" },
  { icon: AlertTriangle, label: "Low Stock Alerts" },
  { icon: PieChart, label: "Profit Margins" },
  { icon: Lock, label: "2FA Security" },
];

const whoIsItFor = [
  { title: "Retail Shops", desc: "High street stores, convenience shops, electronics retailers" },
  { title: "Wholesale Distributors", desc: "Bulk suppliers, cash-and-carry, B2B distributors" },
  { title: "Grocery & Food Stores", desc: "Supermarkets, mini-marts, fresh produce with expiry tracking" },
  { title: "Pharmacies", desc: "Medicine stock management with batch and expiry tracking" },
  { title: "E-Commerce Sellers", desc: "Multi-channel sellers on Amazon, eBay, Etsy, TikTok Shop" },
  { title: "Restaurants & Cafes", desc: "Ingredient tracking, supplier management, cost control" },
];

const howItWorks = [
  { step: "1", title: "Sign Up & Set Up", desc: "Create your account, add your business details, and configure your first store location." },
  { step: "2", title: "Add Your Products", desc: "Import or manually add your inventory. Set prices, stock levels, suppliers, and reorder thresholds." },
  { step: "3", title: "Start Selling", desc: "Use the built-in POS to process sales. Stock updates automatically. Get alerts when items run low." },
  { step: "4", title: "Grow Smarter", desc: "Use analytics, AI forecasts, and reorder suggestions to make data-driven decisions and scale your business." },
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
      "Built-in POS system",
      "Low stock alerts",
      "Basic reports & analytics",
      "Invoice management",
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
      "Expiry date tracking",
      "Smart reorder suggestions",
      "Barcode scanning",
      "Advanced analytics",
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
      "Unlimited users & locations",
      "Multi-warehouse management",
      "AI demand forecasting",
      "Automated smart reordering",
      "Credit ledger",
      "Role-based access control",
      "Stripe Connect payouts",
      "Custom dashboards",
      "Dedicated support",
    ],
  },
];

const trustedBy = [
  "Bright Supplies Ltd", "Northpoint Traders", "MC Electronics", "Prime Retailers", "Swift Distributors",
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
              <span className="hidden sm:block text-[10px] text-muted-foreground uppercase tracking-widest leading-none">Smart Inventory Management</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <Link to="/login" className="hover:text-foreground transition-colors">Login</Link>
          </div>
          <Link to="/register">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-full px-4 sm:px-6 text-sm">
              Start Free Trial
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-24 lg:pb-28">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 border border-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6">
              <Package className="h-3.5 w-3.5" /> SMART INVENTORY FOR GROWING BUSINESSES
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground leading-[1.1]">
              The Inventory System{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Your Business Deserves.
              </span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-4 sm:mt-6 max-w-lg">
              Stokivo is the all-in-one inventory management platform built for SMEs. Track stock across locations, sell through a built-in POS, manage suppliers, and let AI handle your reordering — all in one place.
            </p>
            <div className="flex flex-wrap gap-3 mt-6 sm:mt-8">
              <Link to="/register">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 sm:px-8 h-11 sm:h-12 font-semibold gap-2">
                  Start Free 14-Day Trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="outline" className="rounded-full px-6 sm:px-8 h-11 sm:h-12 gap-2">
                  <Play className="h-4 w-4" /> See How It Works
                </Button>
              </a>
            </div>
            <div className="flex flex-wrap gap-4 sm:gap-6 mt-5 sm:mt-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-accent" /> No Credit Card Required</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-accent" /> Set Up in 5 Minutes</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-accent" /> Cancel Anytime</span>
            </div>
          </div>
          {/* Hero visual — inventory dashboard mockup */}
          <div className="relative hidden lg:block">
            <div className="rounded-2xl bg-card border shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <img src={stokivoLogo} alt="" className="h-7 w-7" />
                <span className="font-display font-bold text-sm">Inventory Dashboard</span>
                <div className="ml-auto flex gap-2">
                  <div className="h-3 w-3 rounded-full bg-destructive/40" />
                  <div className="h-3 w-3 rounded-full bg-warning/40" />
                  <div className="h-3 w-3 rounded-full bg-accent/40" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Products", value: "1,248", change: "3 locations" },
                  { label: "Low Stock Items", value: "18", change: "3 critical" },
                  { label: "Today's Sales", value: "£2,340", change: "+8.3%" },
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-xl bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
                    <p className="text-lg font-bold text-foreground mt-0.5">{kpi.value}</p>
                    <span className="text-[10px] text-accent font-medium">{kpi.change}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-muted/30 p-4">
                <p className="text-xs font-semibold text-foreground mb-2">Stock Levels by Category</p>
                <div className="space-y-2">
                  {[
                    { cat: "Electronics", pct: 82, color: "bg-primary" },
                    { cat: "Groceries", pct: 45, color: "bg-warning" },
                    { cat: "Stationery", pct: 91, color: "bg-accent" },
                    { cat: "Cleaning", pct: 28, color: "bg-destructive" },
                  ].map((c) => (
                    <div key={c.cat} className="flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground w-16">{c.cat}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
                      </div>
                      <span className="text-[10px] font-medium text-foreground w-8 text-right">{c.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Bell className="h-3 w-3 text-destructive" /> Recent Alerts
                </p>
                {[
                  { text: "USB-C Cable — 5 units left", type: "Low Stock" },
                  { text: "Milk (2L) — Expires in 3 days", type: "Expiry" },
                  { text: "Reorder suggested: Notebooks", type: "Reorder" },
                ].map((a) => (
                  <div key={a.text} className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">{a.text}</span>
                    <span className="text-destructive/70 font-medium">{a.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick feature pills */}
      <section className="bg-muted/30 border-y py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {additionalFeatures.map((f) => (
              <div key={f.label} className="flex items-center gap-2 rounded-full bg-card border px-4 py-2 text-xs sm:text-sm font-medium text-foreground shadow-sm">
                <f.icon className="h-3.5 w-3.5 text-primary" />
                {f.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold mb-2">EVERYTHING YOU NEED</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground">
            One Platform to Manage Your Entire Inventory
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-sm sm:text-base">
            From receiving stock to selling products, Stokivo handles every step with smart automation and real-time visibility.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {coreFeatures.map((f) => (
            <div key={f.title} className="group rounded-2xl border bg-card p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300">
              <div className="h-12 w-12 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-base font-display font-bold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who Is It For */}
      <section className="bg-primary text-primary-foreground py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-display font-bold">Built for Every Type of Business</h2>
            <p className="text-primary-foreground/70 mt-3 max-w-lg mx-auto text-sm sm:text-base">
              Whether you run a single shop or manage multiple warehouses, Stokivo adapts to your workflow.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {whoIsItFor.map((item) => (
              <div key={item.title} className="rounded-xl bg-primary-foreground/5 border border-primary-foreground/10 p-5 hover:bg-primary-foreground/10 transition-colors">
                <h3 className="text-sm font-bold mb-1">{item.title}</h3>
                <p className="text-xs text-primary-foreground/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold mb-2">SIMPLE SETUP</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground">
            Up and Running in Minutes
          </h2>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto text-sm sm:text-base">
            Getting started with Stokivo is fast and straightforward.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {howItWorks.map((s, i) => (
            <div key={s.step} className="relative">
              {i < howItWorks.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px border-t-2 border-dashed border-muted-foreground/20 -translate-x-1/2 z-0" />
              )}
              <div className="relative z-10 rounded-2xl border bg-card p-6 text-center">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="text-sm font-display font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-muted/20 border-y py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
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
        </div>
      </section>

      {/* Testimonial + CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="rounded-2xl bg-muted/50 border p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <span className="text-4xl text-primary/30 font-serif">"</span>
              <p className="text-base italic text-foreground leading-relaxed -mt-4">
                "Stokivo has completely transformed how we manage inventory. We went from manual spreadsheets to knowing exactly what's in stock across 3 locations. Our stockouts dropped by 90%."
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
                Ready to Take Control of Your Inventory?
              </h3>
              <p className="text-primary-foreground/70 text-sm mt-3">
                Join hundreds of SMEs across the UK who use Stokivo to manage stock, process sales, and grow their business smarter.
              </p>
            </div>
            <div className="mt-6">
              <Link to="/register">
                <Button size="lg" variant="secondary" className="w-full rounded-full font-semibold h-11 sm:h-12">
                  Start Your Free Trial <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <p className="text-[11px] text-primary-foreground/50 text-center mt-3">No credit card • 14 days free • Set up in minutes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted by */}
      <section className="py-10 sm:py-12 border-t">
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
            <span className="text-[10px] text-muted-foreground">Smart Inventory Management</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Stokivo. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
