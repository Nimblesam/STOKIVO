import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Package, BarChart3, Bell, Users, ShoppingCart,
  CheckCircle2, ArrowRight, Star, Globe,
  ShieldCheck, Zap, Brain, Lock,
  ScanBarcode, FileText, CreditCard, Layers,
  AlertTriangle, PieChart, MapPin, Crown,
  ChevronRight, Sparkles, Monitor, Smartphone, Download,
  Mic, Calendar, TrendingUp, Boxes, RefreshCw,
  Cpu, Wifi, ShoppingBag, Receipt,
} from "lucide-react";
import stokivoLogo from "@/assets/stokivo-logo.png";
import heroSlidePos from "@/assets/hero-slide-pos.jpg";
import heroSlideDashboard from "@/assets/hero-slide-dashboard.jpg";
import heroSlideAi from "@/assets/hero-slide-ai.jpg";
import heroSlideScanning from "@/assets/hero-slide-scanning.jpg";
import dashboardPreview from "@/assets/dashboard-preview.jpg";
import posPreview from "@/assets/pos-preview.jpg";
import analyticsPreview from "@/assets/analytics-preview.jpg";
import { DownloadAppsSection } from "@/components/DownloadAppsSection";
import { useState, useEffect, useCallback } from "react";

const heroSlides = [
  {
    image: heroSlidePos,
    label: "Point of Sale",
    caption: "Ring up sales instantly from any touchscreen",
  },
  {
    image: heroSlideDashboard,
    label: "Smart Dashboard",
    caption: "Real-time stock levels & AI insights at a glance",
  },
  {
    image: heroSlideAi,
    label: "AI Monitoring",
    caption: "24/7 AI watches your stock so you don't have to",
  },
  {
    image: heroSlideScanning,
    label: "Barcode Scanning",
    caption: "Scan in, scan out — inventory updates in real time",
  },
];
/* ─── DATA ─── */

const coreFeatures = [
  {
    icon: ScanBarcode,
    title: "Instant Barcode Scanning",
    desc: "Scan products in or out with a tap. Works with USB, Bluetooth, and camera-based barcode scanners across all devices.",
    gradient: "from-blue-500/10 to-cyan-500/10",
  },
  {
    icon: Brain,
    title: "AI-Powered Stock Intelligence",
    desc: "Let AI monitor your stock levels 24/7. Get smart reorder suggestions based on sales velocity, seasonality, and demand patterns.",
    gradient: "from-violet-500/10 to-purple-500/10",
  },
  {
    icon: Mic,
    title: "Voice-Powered Product Entry",
    desc: "Speak to add products. Just say the name, price, and quantity — Stokivo's voice assistant fills in the rest automatically.",
    gradient: "from-amber-500/10 to-orange-500/10",
  },
  {
    icon: Boxes,
    title: "Live Quantity Tracking",
    desc: "Monitor exact stock quantities across every location in real time. Every sale, return, and adjustment is reflected instantly.",
    gradient: "from-emerald-500/10 to-green-500/10",
  },
  {
    icon: Calendar,
    title: "Expiry Date Monitoring",
    desc: "Track product shelf life and get early warnings before items expire. Reduce waste and stay compliant with batch-level visibility.",
    gradient: "from-rose-500/10 to-pink-500/10",
  },
  {
    icon: RefreshCw,
    title: "Automated Smart Reordering",
    desc: "Set reorder thresholds and let the system alert you — or auto-generate purchase suggestions when stock runs low.",
    gradient: "from-sky-500/10 to-indigo-500/10",
  },
];

const featurePills = [
  { icon: ShoppingCart, label: "Built-in POS" },
  { icon: CreditCard, label: "Card & Cash Payments" },
  { icon: Receipt, label: "Receipt Printing" },
  { icon: MapPin, label: "Multi-Location" },
  { icon: FileText, label: "Invoicing" },
  { icon: Users, label: "Team Roles & Access" },
  { icon: TrendingUp, label: "Profit Tracking" },
  { icon: Lock, label: "2FA Security" },
  { icon: Globe, label: "Custom Domains" },
  { icon: PieChart, label: "Advanced Analytics" },
];

const whoIsItFor = [
  { title: "Retail Shops", desc: "Electronics, clothing, convenience, and high-street stores", icon: ShoppingBag },
  { title: "Wholesale Distributors", desc: "Cash-and-carry, B2B suppliers, bulk distributors", icon: Package },
  { title: "Grocery & Food Stores", desc: "Supermarkets, mini-marts, fresh produce with expiry alerts", icon: Layers },
  { title: "Pharmacies", desc: "Medicine tracking with batch control and expiry management", icon: ShieldCheck },
  { title: "E-Commerce Sellers", desc: "Multi-channel sellers on Amazon, eBay, Etsy, TikTok Shop", icon: Globe },
  { title: "Restaurants & Cafes", desc: "Ingredient tracking, supplier costs, menu item management", icon: Star },
];

const howItWorks = [
  { step: "01", title: "Sign Up in Minutes", desc: "Create your account, set up your business, and configure your first store — no technical knowledge required." },
  { step: "02", title: "Add Products Your Way", desc: "Import via CSV, scan barcodes, or simply speak — voice entry fills in product details automatically." },
  { step: "03", title: "Sell from Any Device", desc: "Use the web dashboard for management, desktop app as a register, or mobile app as a portable POS." },
  { step: "04", title: "Let AI Do the Rest", desc: "Smart alerts, demand forecasts, and reorder suggestions keep your shelves stocked and your profits growing." },
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

const platformFeatures = [
  {
    icon: Monitor,
    platform: "Web App",
    tagline: "Your Business Command Centre",
    features: ["Full inventory management", "Accounting & payroll", "Supplier management", "AI analytics & insights", "Team & role management"],
  },
  {
    icon: Monitor,
    platform: "Desktop POS",
    tagline: "Professional Cash Register",
    features: ["Fast checkout terminal", "Barcode scanning", "Receipt printing", "Refund processing", "Card & cash payments"],
  },
  {
    icon: Smartphone,
    platform: "Mobile POS",
    tagline: "Portable Sales Terminal",
    features: ["Sell from anywhere", "Camera barcode scan", "Offline-ready", "Touch-optimised UI", "Bluetooth printing"],
  },
];

/* ─── COMPONENT ─── */

export default function Landing() {
  const [annual, setAnnual] = useState(false);
  const [activeShowcase, setActiveShowcase] = useState(0);
  const [heroSlide, setHeroSlide] = useState(0);

  const nextHeroSlide = useCallback(() => {
    setHeroSlide((s) => (s + 1) % heroSlides.length);
  }, []);

  useEffect(() => {
    const id = setInterval(nextHeroSlide, 4000);
    return () => clearInterval(id);
  }, [nextHeroSlide]);
  return (
    <div className="min-h-screen bg-background">
      {/* ═══════════════ NAVIGATION ═══════════════ */}
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
            <a href="#download" className="hover:text-foreground transition-colors flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" /> Download
            </a>
            <Link to="/login" className="hover:text-foreground transition-colors">Login</Link>
          </div>
          <Link to="/register">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-full px-5 sm:px-6 text-sm h-9">
              Start Free Trial
            </Button>
          </Link>
        </div>
      </nav>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent" />
        <div className="absolute top-20 -left-32 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-40 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-8 sm:pt-20 sm:pb-12 lg:pt-24 lg:pb-16 relative">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            {/* Left — Text */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 border border-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6 sm:mb-8 animate-fade-in">
                <Brain className="h-3.5 w-3.5" /> AI monitors your stock 24/7
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl font-display font-bold text-foreground leading-[1.08] tracking-tight">
                Stock Smarter.{" "}
                <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                  Sell Faster.
                </span>
                <br />
                <span className="text-foreground">Grow Bigger.</span>
              </h1>
              <p className="text-base sm:text-lg lg:text-lg text-muted-foreground mt-4 sm:mt-6 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                AI-powered inventory management that watches your stock levels, predicts demand, and keeps your shelves perfectly stocked — so you never miss a sale.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-3 mt-6 sm:mt-8">
                <Link to="/register">
                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 sm:px-8 h-12 sm:h-13 font-semibold gap-2 text-base shadow-lg shadow-primary/20">
                    Start Free 30-Day Trial <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#download">
                  <Button size="lg" variant="outline" className="rounded-full px-6 sm:px-8 h-12 sm:h-13 gap-2 text-base">
                    <Download className="h-4 w-4" /> Download Apps
                  </Button>
                </a>
              </div>
              <div className="flex flex-wrap justify-center lg:justify-start gap-4 sm:gap-6 mt-5 text-xs sm:text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-accent" /> No Credit Card</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-accent" /> 5-Min Setup</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-accent" /> Cancel Anytime</span>
              </div>
            </div>

            {/* Right — Auto-playing Carousel */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/20 border border-primary/10">
                {/* Slides */}
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  {heroSlides.map((slide, i) => (
                    <img
                      key={i}
                      src={slide.image}
                      alt={slide.caption}
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === heroSlide ? "opacity-100" : "opacity-0"}`}
                      width={1280}
                      height={720}
                    />
                  ))}
                  {/* Gradient overlay at bottom */}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
                  {/* Caption */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                    <div>
                      <span className="inline-block bg-primary/90 text-primary-foreground text-[10px] font-bold uppercase tracking-wider rounded px-2 py-0.5 mb-1">
                        {heroSlides[heroSlide].label}
                      </span>
                      <p className="text-white text-sm font-medium drop-shadow-lg">
                        {heroSlides[heroSlide].caption}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Dot indicators */}
                <div className="absolute bottom-4 right-4 flex gap-1.5">
                  {heroSlides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setHeroSlide(i)}
                      className={`h-2 rounded-full transition-all duration-300 ${i === heroSlide ? "w-6 bg-primary" : "w-2 bg-white/50 hover:bg-white/80"}`}
                    />
                  ))}
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-4 sm:-bottom-5 sm:-left-6 bg-card border rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 animate-fade-in z-10">
                <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-display font-bold text-foreground">AI Stock Monitor</p>
                  <p className="text-xs text-muted-foreground">Always watching, always learning</p>
                </div>
              </div>
            </div>
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
                    <div className="h-2 w-2 rounded-full bg-destructive/60" />
                    <div className="h-2 w-2 rounded-full bg-warning/60" />
                    <div className="h-2 w-2 rounded-full bg-accent/60" />
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

      {/* ═══════════════ PLATFORM BREAKDOWN ═══════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">ONE PLATFORM, THREE MODES</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground">
            Manage on Web. Sell on Desktop & Mobile.
          </h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm sm:text-base">
            Your business brain lives on the web. Your point of sale lives wherever you need it.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {platformFeatures.map((p, i) => (
            <div
              key={p.platform}
              className={`rounded-2xl border-2 p-6 sm:p-7 transition-all hover:shadow-lg ${
                i === 0
                  ? "border-primary/30 bg-primary/[0.02]"
                  : "border-border bg-card hover:border-primary/20"
              }`}
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <p.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-display font-bold text-foreground">{p.platform}</h3>
              <p className="text-sm text-primary font-medium mb-4">{p.tagline}</p>
              <ul className="space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ WHO IS IT FOR ═══════════════ */}
      <section className="bg-muted/20 border-y py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
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
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
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

      {/* ═══════════════ PRICING ═══════════════ */}
      <section id="pricing" className="py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">PRICING</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm sm:text-base">Choose the plan that fits your business. Upgrade anytime.</p>

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
                <span className="inline-flex items-center rounded-full bg-accent/10 border border-accent/20 px-2.5 py-0.5 text-xs font-semibold text-accent">
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
                        <span className="text-accent font-medium">billed annually</span>
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

      {/* ═══════════════ TESTIMONIAL + CTA ═══════════════ */}
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
                  Join thousands of SMEs who use Stokivo to manage stock, process sales, and grow their business smarter.
                </p>
              </div>
              <div className="mt-6">
                <Link to="/register">
                  <Button size="lg" variant="secondary" className="w-full rounded-full font-semibold h-12 text-base">
                    Start Your Free Trial <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <p className="text-[11px] text-primary-foreground/50 text-center mt-3">No credit card • 30 days free • Cancel anytime</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ DOWNLOAD APPS ═══════════════ */}
      <section id="download" className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">AVAILABLE EVERYWHERE</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground mb-2">Download Stokivo Apps</h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Use the <strong className="text-foreground">web app</strong> for full business management.
            Install the <strong className="text-foreground">desktop or mobile app</strong> as your dedicated POS terminal.
          </p>
        </div>
        <DownloadAppsSection variant="landing" />

        {/* Hardware compatibility */}
        <div className="mt-10 rounded-2xl border bg-muted/30 p-6 sm:p-8 text-center">
          <div className="flex justify-center gap-3 mb-3">
            <Cpu className="h-5 w-5 text-primary" />
            <Wifi className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-base font-display font-bold text-foreground mb-2">Works With Your Hardware</h3>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Compatible with Android POS devices, including SUNMI terminals and standard retail hardware.
            Stokivo works seamlessly with USB and Bluetooth barcode scanners, receipt printers, cash drawers, and touchscreen displays —
            no proprietary equipment required.
          </p>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="border-t py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={stokivoLogo} alt="Stokivo" className="h-6 w-6" />
              <span className="font-display font-bold text-sm">Stokivo</span>
              <span className="text-[10px] text-muted-foreground">Smart Inventory Management</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <a href="#download" className="hover:text-foreground transition-colors">Download</a>
              <Link to="/login" className="hover:text-foreground transition-colors">Login</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            </div>
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Stokivo. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
