import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { StoreProvider } from "@/contexts/StoreContext";
import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext";
import { AppModeProvider, useAppMode } from "@/contexts/AppModeContext";
import { AppLayout } from "@/components/AppLayout";
import { PosLayout } from "@/components/pos/PosLayout";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Suppliers from "./pages/Suppliers";
import Customers from "./pages/Customers";
import Invoices from "./pages/Invoices";
import LowStockAlerts from "./pages/LowStockAlerts";
import PriceChangeAlerts from "./pages/PriceChangeAlerts";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import InventoryMovements from "./pages/InventoryMovements";
import CreditLedger from "./pages/CreditLedger";
import Payouts from "./pages/Payouts";
import Cashier from "./pages/Cashier";
import Accounting from "./pages/Accounting";
import Payroll from "./pages/Payroll";
import Integrations from "./pages/Integrations";
import AIInsights from "./pages/AIInsights";
import Landing from "./pages/Landing";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import PendingApproval from "./pages/PendingApproval";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import SetPassword from "./pages/SetPassword";
import Unsubscribe from "./pages/Unsubscribe";
import TrialExpired from "./pages/TrialExpired";
import { useTrialStatus } from "@/hooks/use-trial-status";
import PosRefunds from "./pages/pos/PosRefunds";
import PosReceipts from "./pages/pos/PosReceipts";
import PosMore from "./pages/pos/PosMore";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminSetup from "./pages/admin/AdminSetup";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAdmins from "./pages/admin/AdminAdmins";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminIntegrations from "./pages/admin/AdminIntegrations";
import AdminSystem from "./pages/admin/AdminSystem";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminFeatureFlags from "./pages/admin/AdminFeatureFlags";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import KitchenDisplay from "./pages/KitchenDisplay";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile, company, mfaRequired, profileLoading, authResolved } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const trial = useTrialStatus();
  if (loading || profileLoading || !authResolved || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl stokivo-gradient flex items-center justify-center animate-pulse-subtle">
            <span className="text-accent-foreground font-display font-bold">S</span>
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (mfaRequired) return <Navigate to="/login" replace />;
  // Platform admins should never see merchant pages
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (!profile?.company_id) return <Navigate to="/onboarding" replace />;
  if (company && company.status !== "active") return <Navigate to="/pending-approval" replace />;

  // Lock features when trial has expired and there's no active subscription.
  // Allow Settings (billing tab) so users can upgrade.
  if (!trial.loading && trial.isExpired && !trial.hasActiveSubscription) {
    const path = window.location.pathname;
    const allowed = path.startsWith("/settings") || path === "/trial-expired";
    if (!allowed) return <Navigate to="/trial-expired" replace />;
  }

  return <>{children}</>;
}

/** POS mode: skip onboarding/pending checks — just require auth */
function PosProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, mfaRequired } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl stokivo-gradient flex items-center justify-center animate-pulse-subtle">
            <span className="text-accent-foreground font-display font-bold">S</span>
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (mfaRequired) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile, company, mfaRequired, profileLoading, authResolved } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  if (loading || profileLoading || !authResolved || adminLoading) return null;
  if (mfaRequired) return <>{children}</>;
  // Platform admins: allow them to stay on public pages without onboarding redirects
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (user && profile?.company_id) {
    return <Navigate to={company && company.status !== "active" ? "/pending-approval" : "/dashboard"} replace />;
  }
  if (user && !profile?.company_id) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin } = useAdminAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  );
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

/** Web = Full business management */
function WebRoutes() {
  return (
    <AppLayout>
      <Routes>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="inventory/movements" element={<InventoryMovements />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="customers" element={<Customers />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="alerts/low-stock" element={<LowStockAlerts />} />
        <Route path="alerts/price-changes" element={<PriceChangeAlerts />} />
        <Route path="credit-ledger" element={<CreditLedger />} />
        <Route path="payouts" element={<Payouts />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="accounting" element={<Accounting />} />
        <Route path="payroll" element={<Payroll />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="ai-insights" element={<AIInsights />} />
        <Route path="kds" element={<KitchenDisplay />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

/** Desktop/Mobile = POS only */
function PosRoutes() {
  return (
    <PosLayout>
      <Routes>
        <Route index element={<Cashier />} />
        <Route path="refunds" element={<PosRefunds />} />
        <Route path="receipts" element={<PosReceipts />} />
        <Route path="more" element={<PosMore />} />
        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Routes>
    </PosLayout>
  );
}

function ModeRouter() {
  const { isPosMode } = useAppMode();

  if (isPosMode) {
    // POS mode: Login → Cashier directly, no onboarding
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/landing" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        {/* Signup is web-only — redirect to login on desktop/mobile apps */}
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/set-password" element={<SetPassword />} />

        {/* No onboarding in POS mode — redirect to POS */}
        <Route path="/onboarding" element={<Navigate to="/pos" replace />} />
        <Route path="/pending-approval" element={<Navigate to="/pos" replace />} />

        <Route path="/pos/*" element={
          <PosProtectedRoute>
            <PosRoutes />
          </PosProtectedRoute>
        } />

        {/* Redirect everything else to POS */}
        <Route path="/*" element={<Navigate to="/pos" replace />} />
      </Routes>
    );
  }

  // Full mode: standard web app routing
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/features" element={<Landing />} />
      <Route path="/download" element={<Landing />} />
      <Route path="/pricing" element={<Landing />} />
      <Route path="/product" element={<Landing />} />
      <Route path="/contact" element={<Landing />} />
      <Route path="/about" element={<Landing />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/pending-approval" element={<PendingApproval />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route path="/unsubscribe" element={<Unsubscribe />} />
      <Route path="/trial-expired" element={
        <ProtectedRoute>
          <TrialExpired />
        </ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/setup" element={<AdminSetup />} />
      <Route path="/admin/*" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <Routes>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="companies" element={<AdminCompanies />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="admins" element={<AdminAdmins />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
              <Route path="transactions" element={<AdminTransactions />} />
              <Route path="integrations" element={<AdminIntegrations />} />
              <Route path="system" element={<AdminSystem />} />
              <Route path="audit-logs" element={<AdminAuditLogs />} />
              <Route path="feature-flags" element={<AdminFeatureFlags />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="support" element={<AdminSupport />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AdminLayout>
        </AdminProtectedRoute>
      } />

      {/* POS route accessible in full mode too — uses AppLayout so sidebar is visible */}
      <Route path="/pos/*" element={
        <ProtectedRoute>
          <AppLayout>
            <Routes>
              <Route index element={<Cashier />} />
              <Route path="refunds" element={<PosRefunds />} />
              <Route path="receipts" element={<PosReceipts />} />
              <Route path="more" element={<PosMore />} />
              <Route path="*" element={<Navigate to="/pos" replace />} />
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      } />

      {/* Web management routes */}
      <Route path="/*" element={
        <ProtectedRoute>
          <WebRoutes />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <AuthProvider>
            <StoreProvider>
              <AdminAuthProvider>
                <AppModeProvider>
                  <ModeRouter />
                </AppModeProvider>
              </AdminAuthProvider>
            </StoreProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
