import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Package, BarChart3, Bell, Users, ShoppingCart,
  CheckCircle2, ArrowRight, Star, Globe,
  ShieldCheck, Zap, Brain, Lock,
  ScanBarcode, FileText, CreditCard, Layers,
  AlertTriangle, PieChart, MapPin, Crown,
  ChevronRight, Sparkles, Monitor, Smartphone,
} from "lucide-react";
import stokivoLogo from "@/assets/stokivo-logo.png";
import dashboardPreview from "@/assets/dashboard-preview.jpg";
import posPreview from "@/assets/pos-preview.jpg";
import analyticsPreview from "@/assets/analytics-preview.jpg";
import { useState } from "react";

const coreFeatures = [
  {
    icon: Package,
    title: "Real-Time Stock Tracking",
    desc: "Know exactly what's on the shelf, what's incoming, and what needs restocking — across every location.",
  },
  {
    icon: ShoppingCart,
    title: "Built-in POS System",
    desc: "Process sales, accept card payments via Stripe Terminal, print receipts, and auto-update stock from one screen.",
  },
  {
    icon: MapPin,
    title: "Multi-Location & Warehouse",
    desc: "Manage inventory across stores and warehouses. Transfer stock between locations with full audit trails.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    desc: "Visual dashboards for best sellers, profit margins, sales trends, and seasonal patterns.",
  },
  {
    icon: Bell,
    title: "Smart Alerts & Reordering",
    desc: "Get notified before stockouts happen. AI-powered reorder suggestions based on sales velocity.",
  },
  {
    icon: Brain,
    title: "AI Demand Forecasting",
    desc: "Predict future demand using sales history. See 7-day forecasts and trending products at a glance.",
  },
];

const additionalFeatures = [
  { icon: ScanBarcode, label: "Barcode Scanning" },
  { icon: FileText, label: "Invoicing & Billing" },
  { icon: CreditCard, label: "Stripe Payments" },
  { icon: Users, label: "Team & Role Access" },
  { icon: AlertTriangle, label: "Expiry Tracking" },
  { icon: PieChart, label: "Profit Margins" },
  { icon: Lock, label: "2FA Security" },
  { icon: Globe, label: "Custom Domains" },
];

const whoIsItFor = [
  { title: "Retail Shops", desc: "High street stores, convenience shops, electronics retailers", icon: ShoppingCart },
  { title: "Wholesale Distributors", desc: "Bulk suppliers, cash-and-carry, B2B distributors", icon: Package },
  { title: "Grocery & Food Stores", desc: "Supermarkets, mini-marts, fresh produce with expiry tracking", icon: Layers },
  { title: "Pharmacies", desc: "Medicine stock management with batch and expiry tracking", icon: ShieldCheck },
  { title: "E-Commerce Sellers", desc: "Multi-channel sellers on Amazon, eBay, Etsy, TikTok Shop", icon: Globe },
  { title: "Restaurants & Cafes", desc: "Ingredient tracking, supplier management, cost control", icon: Star },
];

const howItWorks = [
  { step: "01", title: "Sign Up & Set Up", desc: "Create your account, add your business details, and configure your first store location in minutes." },
  { step: "02", title: "Add Your Products", desc: "Import or manually add inventory. Set prices, stock levels, suppliers, and reorder thresholds." },
  { step: "03", title: "Start Selling", desc: "Use the built-in POS to process sales. Stock updates automatically. Get alerts when items run low." },
  { step: "04", title: "Grow Smarter", desc: "Use analytics, AI forecasts, and reorder suggestions to make data-driven decisions." },
];

const plans = [
  {
    name: "Starter", tier: "starter",
    monthly: 19, annual: 15, highlight: false,
    cta: "Get Started",
    features: ["Up to 2 users", "500 products", "Real-time stock tracking", "Built-in POS system", "Low stock alerts", "Basic reports", "Invoice management", "Email support"],
  },
  {
    name: "Growth", tier: "growth",
    monthly: 39, annual: 31, highlight: true,
    cta: "Start Growth",
    features: ["Everything in Starter", "Unlimited products", "Multi-location inventory", "Expiry date tracking", "Smart reorder suggestions", "Barcode scanning", "Advanced analytics", "AI insights", "Up to 8 users", "Priority support"],
  },
  {
    name: "Pro", tier: "pro",
    monthly: 79, annual: 63, highlight: false,
    cta: "Go Pro",
    features: ["Everything in Growth", "Unlimited users & locations", "Multi-warehouse management", "AI demand forecasting", "Automated smart reordering", "Role-based access control", "Stripe Connect payouts", "Custom domains", "Dedicated support"],
  },
];

const stats = [
  { value: "2,500+", label: "Businesses" },
  { value: "99.9%", label: "Uptime" },
  { value: "4M+", label: "Items Tracked" },
  { value: "< 5 min", label: "Setup Time" },
];

const featureShowcase = [
  {
    title: "Powerful Inventory Dashboard",
    desc: "Get a complete bird's-eye view of your entire inventory. Track stock levels, sales trends, low stock alerts, and revenue — all from one beautiful dashboard.",
    image: dashboardPreview,
    badges: ["Real-time sync", "Multi-location", "Smart alerts"],
  },
  {
    title: "Built-in Point of Sale",
    desc: "Ring up sales in seconds with our intuitive POS. Accept cash, card, or split payments. Stock automatically adjusts with every transaction.",
    image: posPreview,
    badges: ["Stripe Terminal", "Receipt printing", "Split payments"],
  },
  {
    title: "Analytics & AI Insights",
    desc: "Make smarter decisions with powerful analytics. See profit margins, top sellers, demand forecasts, and automated reorder suggestions powered by AI.",
    image: analyticsPreview,
    badges: ["AI forecasting", "Profit tracking", "Trend analysis"],
  },
];

export default function Landing() {
  const [annual, setAnnual] = useState(false);
  const [activeShowcase, setActiveShowcase] = useState(0);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-2.5">
            <img src={stokivoLogo} alt="Stokivo" className="h-8 w-8 sm:h-9 sm:w-9" />
            <div>
              <span className="font-display font-bold text-lg sm:text-xl text-foreground">Stokivo</span>
              <span className="hidden sm:block text-[10px] text-muted-foreground uppercase tracking-widest leading-none">Smart Inventory</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#product" className="hover:text-foreground transition-colors">Product</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <Link to="/login" className="hover:text-foreground transition-colors">Login</Link>
          </div>
          <Link to="/register">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-full px-5 sm:px-6 text-sm h-9">
              Start Free Trial
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-8 sm:pt-20 sm:pb-12 lg:pt-24 lg:pb-16 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 border border-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6 sm:mb-8">
              <Sparkles className="h-3.5 w-3.5" /> Now with AI-powered demand forecasting
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold text-foreground leading-[1.08] tracking-tight">
              Smart Inventory{" "}
              <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                Management
              </span>
              <br className="hidden sm:block" />
              <span className="text-foreground"> for Growing Businesses</span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mt-4 sm:mt-6 max-w-2xl mx-auto leading-relaxed">
              Track stock across locations, sell through a built-in POS, manage suppliers, and let AI handle reordering — all in one platform built for SMEs.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-6 sm:mt-8">
              <Link to="/register">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 sm:px-8 h-12 sm:h-13 font-semibold gap-2 text-base shadow-lg shadow-primary/20">
                  Start Free 30-Day Trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#product">
                <Button size="lg" variant="outline" className="rounded-full px-6 sm:px-8 h-12 sm:h-13 gap-2 text-base">
                  <Monitor className="h-4 w-4" /> See the Product
                </Button>
              </a>
            </div>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-5 text-xs sm:text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-accent" /> No Credit Card</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-accent" /> 5-Min Setup</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-accent" /> Cancel Anytime</span>
            </div>
          </div>

          {/* Hero dashboard image */}
          <div className="mt-10 sm:mt-14 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none h-full" />
            <div className="rounded-xl sm:rounded-2xl overflow-hidden border shadow-2xl shadow-primary/10 mx-auto max-w-5xl">
              <div className="bg-card border-b px-4 py-2.5 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-muted/60 rounded-md px-4 py-1 text-[10px] text-muted-foreground font-mono">app.stokivo.com/dashboard</div>
                </div>
              </div>
              <img
                src={dashboardPreview}
                alt="Stokivo Inventory Dashboard showing real-time stock levels, sales trends, and smart alerts"
                className="w-full"
                width={1920}
                height={1080}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y bg-muted/20 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-display font-bold text-foreground">{s.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature pills */}
      <section className="py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {additionalFeatures.map((f) => (
              <div key={f.label} className="flex items-center gap-2 rounded-full bg-card border px-4 py-2 text-xs sm:text-sm font-medium text-foreground shadow-sm hover:shadow-md transition-shadow">
                <f.icon className="h-3.5 w-3.5 text-primary" />
                {f.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">EVERYTHING YOU NEED</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground">
            One Platform for Your Entire Inventory
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

      {/* Product Showcase - tabbed screenshots */}
      <section id="product" className="bg-muted/20 border-y py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">SEE IT IN ACTION</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground">
              Built for How You Actually Work
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm sm:text-base">
              Every screen is designed to save you time and give you clarity.
            </p>
          </div>

          {/* Showcase tabs */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8">
            {featureShowcase.map((item, i) => (
              <button
                key={item.title}
                onClick={() => setActiveShowcase(i)}
                className={`flex items-center gap-2 rounded-full px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all ${
                  activeShowcase === i
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-card border text-muted-foreground hover:text-foreground hover:border-primary/20"
                }`}
              >
                {i === 0 && <Monitor className="h-3.5 w-3.5" />}
                {i === 1 && <ShoppingCart className="h-3.5 w-3.5" />}
                {i === 2 && <BarChart3 className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{item.title}</span>
                <span className="sm:hidden">{item.title.split(" ").slice(-1)[0]}</span>
              </button>
            ))}
          </div>

          {/* Active showcase */}
          <div className="grid lg:grid-cols-5 gap-6 lg:gap-10 items-center">
            <div className="lg:col-span-2 order-2 lg:order-1">
              <h3 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-3">
                {featureShowcase[activeShowcase].title}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-5">
                {featureShowcase[activeShowcase].desc}
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {featureShowcase[activeShowcase].badges.map((b) => (
                  <span key={b} className="inline-flex items-center gap-1.5 rounded-full bg-primary/5 border border-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <CheckCircle2 className="h-3 w-3" /> {b}
                  </span>
                ))}
              </div>
              <Link to="/register">
                <Button className="rounded-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  Try It Free <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="lg:col-span-3 order-1 lg:order-2">
              <div className="rounded-xl sm:rounded-2xl overflow-hidden border shadow-xl">
                <div className="bg-card border-b px-3 py-2 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-red-400" />
                    <div className="h-2 w-2 rounded-full bg-yellow-400" />
                    <div className="h-2 w-2 rounded-full bg-green-400" />
                  </div>
                </div>
                <img
                  src={featureShowcase[activeShowcase].image}
                  alt={featureShowcase[activeShowcase].title}
                  className="w-full"
                  loading="lazy"
                  width={1920}
                  height={1080}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who Is It For */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">WHO IT'S FOR</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground">Built for Every Type of Business</h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm sm:text-base">
            Whether you run a single shop or manage multiple warehouses, Stokivo adapts to your workflow.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {whoIsItFor.map((item) => (
            <div key={item.title} className="rounded-2xl border bg-card p-5 sm:p-6 hover:shadow-md hover:border-primary/15 transition-all group">
              <div className="h-10 w-10 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-display font-bold text-foreground mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-primary text-primary-foreground py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/60 font-semibold mb-3">SIMPLE SETUP</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold">
              Up and Running in Minutes
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {howItWorks.map((s, i) => (
              <div key={s.step} className="relative">
                {i < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px border-t-2 border-dashed border-primary-foreground/15 -translate-x-1/2 z-0" />
                )}
                <div className="relative z-10 rounded-2xl bg-primary-foreground/5 border border-primary-foreground/10 p-6 text-center hover:bg-primary-foreground/10 transition-colors">
                  <div className="text-3xl font-display font-bold text-primary-foreground/20 mb-3">{s.step}</div>
                  <h3 className="text-sm font-display font-bold mb-2">{s.title}</h3>
                  <p className="text-xs text-primary-foreground/60 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">PRICING</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm sm:text-base">Choose the plan that fits your business. Upgrade anytime.</p>

            {/* Billing toggle — fixed */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mt-8">
              <span className={`text-sm font-medium transition-colors ${!annual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
              <Switch
                checked={annual}
                onCheckedChange={setAnnual}
                aria-label="Toggle annual billing"
                className="data-[state=checked]:bg-primary"
              />
              <span className={`text-sm font-medium transition-colors ${annual ? "text-foreground" : "text-muted-foreground"}`}>
                Annual
              </span>
              {annual && (
                <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
                  Save 20%
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => {
              const planIcons: Record<string, typeof Zap> = { Starter: Zap, Growth: Star, Pro: Crown };
              const Icon = planIcons[plan.name] || Zap;
              return (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl border-2 p-5 sm:p-7 flex flex-col transition-all ${
                    plan.highlight
                      ? "border-primary bg-primary/[0.02] shadow-xl scale-[1.01] sm:scale-105"
                      : "border-border bg-card hover:border-primary/20"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                        <Star className="h-3 w-3" /> Most Popular
                      </span>
                    </div>
                  )}
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-display font-bold text-foreground">{plan.name}</h3>
                    </div>
                    <div>
                      <span className="text-4xl font-display font-bold text-foreground">£{annual ? plan.annual : plan.monthly}</span>
                      <span className="text-muted-foreground text-sm">/month</span>
                    </div>
                    {annual && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="line-through">£{plan.monthly}/month</span>{" "}
                        <span className="text-green-600 font-medium">billed annually</span>
                      </p>
                    )}
                  </div>
                  <ul className="space-y-2.5 flex-1 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/register" className="block">
                    <Button
                      className={`w-full rounded-full font-semibold h-11 ${
                        plan.highlight
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                          : ""
                      }`}
                      variant={plan.highlight ? "default" : "outline"}
                    >
                      {plan.cta} <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonial + CTA */}
      <section className="border-y bg-muted/20 py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8">
            <div className="rounded-2xl bg-card border p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-base sm:text-lg text-foreground leading-relaxed">
                  "Stokivo has completely transformed how we manage inventory. We went from spreadsheets to knowing exactly what's in stock across 3 locations. Stockouts dropped by 90%."
                </p>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">AK</div>
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
                <p className="text-primary-foreground/70 text-sm mt-3 leading-relaxed">
                  Join thousands of SMEs across the UK who use Stokivo to manage stock, process sales, and grow their business smarter.
                </p>
              </div>
              <div className="mt-6">
                <Link to="/register">
                  <Button size="lg" variant="secondary" className="w-full rounded-full font-semibold h-12 text-base">
                    Start Your Free Trial <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <p className="text-[11px] text-primary-foreground/50 text-center mt-3">No credit card • 14 days free • Cancel anytime</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile + desktop callout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="rounded-2xl border bg-card p-6 sm:p-10 text-center">
          <div className="flex justify-center gap-3 mb-4">
            <Monitor className="h-8 w-8 text-primary" />
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-2">Works on Every Device</h3>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-6">
            Access your inventory from your desktop, tablet, or phone. Stokivo is fully responsive and works anywhere you need it.
          </p>
          <Link to="/register">
            <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-8 h-11 font-semibold gap-2">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={stokivoLogo} alt="Stokivo" className="h-6 w-6" />
              <span className="font-display font-bold text-sm">Stokivo</span>
              <span className="text-[10px] text-muted-foreground">Smart Inventory Management</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <Link to="/login" className="hover:text-foreground transition-colors">Login</Link>
            </div>
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Stokivo. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
