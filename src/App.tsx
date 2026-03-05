import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
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
import Register from "./pages/Register";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl zentra-gradient flex items-center justify-center animate-pulse-subtle">
            <span className="text-accent-foreground font-display font-bold">Z</span>
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

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/onboarding" element={<Onboarding />} />
    <Route
      path="/*"
      element={
        <ProtectedRoute>
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
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      }
    />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
