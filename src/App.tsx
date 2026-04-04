import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext";
import { AppLayout } from "@/components/AppLayout";
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
import Integrations from "./pages/Integrations";
import AIInsights from "./pages/AIInsights";
import Landing from "./pages/Landing";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
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

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile } = useAuth();
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
  if (!profile?.company_id) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile } = useAuth();
  if (loading) return null;
  if (user && profile?.company_id) return <Navigate to="/dashboard" replace />;
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

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/onboarding" element={<Onboarding />} />
    <Route path="/privacy" element={<PrivacyPolicy />} />
    <Route path="/terms" element={<TermsOfService />} />

    {/* Admin routes - public */}
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/admin/setup" element={<AdminSetup />} />

    {/* Admin routes - protected */}
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

    <Route path="/*" element={
      <ProtectedRoute>
        <AppLayout>
          <Routes>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="pos" element={<Cashier />} />
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
            <Route path="integrations" element={<Integrations />} />
            <Route path="ai-insights" element={<AIInsights />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </ProtectedRoute>
    } />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <AdminAuthProvider>
            <AppRoutes />
          </AdminAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
