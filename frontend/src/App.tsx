import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import SetupPasswordPage from '@/pages/auth/SetupPasswordPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import ProductsPage from '@/pages/products/ProductsPage';
import CustomersPage from '@/pages/customers/CustomersPage';
import VendorsPage from '@/pages/vendors/VendorsPage';
import WarehousesPage from '@/pages/warehouses/WarehousesPage';
import InventoryPage from '@/pages/inventory/InventoryPage';
import PurchasesPage from '@/pages/purchases/PurchasesPage';
import SalesPage from '@/pages/sales/SalesPage';
import TransfersPage from '@/pages/transfers/TransfersPage';
import ReportsPage from '@/pages/reports/ReportsPage';
import SettingsPage from '@/pages/settings/SettingsPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminCompaniesPage from '@/pages/admin/AdminCompaniesPage';
import DashboardLayout from '@/layouts/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

// Helper to wrap a page in the layout + protection
function ProtectedPage({ children, requiredPermission }: { children: React.ReactNode; requiredPermission?: string }) {
  return (
    <ProtectedRoute requiredPermission={requiredPermission}>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/setup-password" element={<ProtectedRoute><SetupPasswordPage /></ProtectedRoute>} />

          {/* Dashboard */}
          <Route path="/dashboard" element={<ProtectedPage><DashboardPage /></ProtectedPage>} />

          {/* Core Business Modules */}
          <Route path="/products" element={<ProtectedPage requiredPermission="product.view"><ProductsPage /></ProtectedPage>} />
          <Route path="/inventory" element={<ProtectedPage requiredPermission="inventory.view"><InventoryPage /></ProtectedPage>} />
          <Route path="/customers" element={<ProtectedPage requiredPermission="customer.view"><CustomersPage /></ProtectedPage>} />
          <Route path="/vendors" element={<ProtectedPage requiredPermission="vendor.view"><VendorsPage /></ProtectedPage>} />
          <Route path="/warehouses" element={<ProtectedPage requiredPermission="warehouse.view"><WarehousesPage /></ProtectedPage>} />
          <Route path="/purchases" element={<ProtectedPage requiredPermission="purchase.view"><PurchasesPage /></ProtectedPage>} />
          <Route path="/sales" element={<ProtectedPage requiredPermission="sales.view"><SalesPage /></ProtectedPage>} />
          <Route path="/transfers" element={<ProtectedPage requiredPermission="warehouse.view"><TransfersPage /></ProtectedPage>} />
          <Route path="/reports" element={<ProtectedPage requiredPermission="reports.view"><ReportsPage /></ProtectedPage>} />
          <Route path="/settings" element={<ProtectedPage requiredPermission="settings.read"><SettingsPage /></ProtectedPage>} />
          
          {/* Platform Admin */}
          <Route path="/admin/dashboard" element={<ProtectedPage requiredPermission="*"><AdminDashboardPage /></ProtectedPage>} />
          <Route path="/admin/companies" element={<ProtectedPage requiredPermission="*"><AdminCompaniesPage /></ProtectedPage>} />

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '1px solid hsl(var(--border))',
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
