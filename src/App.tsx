import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/*"
            element={
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
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
