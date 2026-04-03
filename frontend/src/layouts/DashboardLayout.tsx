import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Package,
  LayoutDashboard,
  ShoppingCart,
  PackageSearch,
  Users,
  Truck,
  Warehouse,
  FileBarChart,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Bell,
  Search,
  Moon,
  Sun,
  Receipt,
  Box,
  Building2,
  PieChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import WalkthroughTour from '@/components/WalkthroughTour';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, requiredPermission: 'dashboard.view' },
  { name: 'Products', href: '/products', icon: Box, requiredPermission: 'product.view' },
  { name: 'Inventory', href: '/inventory', icon: PackageSearch, requiredPermission: 'inventory.view' },
  { name: 'Customers', href: '/customers', icon: Users, requiredPermission: 'customer.view' },
  { name: 'Vendors', href: '/vendors', icon: Truck, requiredPermission: 'vendor.view' },
  { name: 'Warehouses', href: '/warehouses', icon: Warehouse, requiredPermission: 'warehouse.view' },
  { name: 'Purchases', href: '/purchases', icon: ShoppingCart, requiredPermission: 'purchase.view' },
  { name: 'Sales', href: '/sales', icon: Receipt, requiredPermission: 'sales.view' },
  { name: 'Transfers', href: '/transfers', icon: Truck, requiredPermission: 'warehouse.view' },
  { name: 'Reports', href: '/reports', icon: FileBarChart, requiredPermission: 'reports.view' },
  { name: 'Settings', href: '/settings', icon: Settings, requiredPermission: 'settings.view' },
];

const adminNavigation = [
  { name: 'Platform Stats', href: '/admin/dashboard', icon: PieChart },
  { name: 'Manage Companies', href: '/admin/companies', icon: Building2 },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, company, logout } = useAuthStore();

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'U';

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-sidebar-foreground">InventoryPro</h2>
              <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                {company?.name || 'My Company'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation
            .filter((item) => !item.requiredPermission || useAuthStore.getState().hasPermission(item.requiredPermission))
            .map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                id={`nav-${item.name.toLowerCase()}`}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <item.icon
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground'
                  )}
                />
                {item.name}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}

          {user?.role === 'super_admin' && (
            <div className="pt-4 mt-4 border-t border-sidebar-border">
              <p className="px-3 mb-2 text-[10px] uppercase tracking-widest font-bold text-muted-foreground opacity-50">Platform Admin</p>
              {adminNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'w-5 h-5 transition-colors',
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground'
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-xs font-bold text-white">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground capitalize truncate">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-muted-foreground hover:text-foreground"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="hidden md:flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 w-72">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search anything..."
                  className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                className="text-muted-foreground"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive" />
              </Button>
              <div className="hidden md:flex items-center gap-2 ml-2 pl-2 border-l">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-[11px] font-bold text-white">
                  {initials}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {user?.role?.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <div className="page-enter">{children}</div>
        </main>
      </div>

      <WalkthroughTour />
    </div>
  );
}
