// User types
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyId: string;
  role: UserRole;
  permissions: string[];
  avatar?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  isTemporaryPassword?: boolean;
  hasSeenTour?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserRole =
  | 'super_admin'
  | 'company_owner'
  | 'inventory_manager'
  | 'sales_manager'
  | 'purchase_manager'
  | 'warehouse_manager'
  | 'accountant'
  | 'staff'
  | 'read_only';

// Company types
export interface Company {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  email?: string;
  phone?: string;
  address?: Address;
  gstNumber?: string;
  industry: IndustryType;
  settings: CompanySettings;
  subscriptionPlan: SubscriptionPlan;
  isActive: boolean;
  trialEndsAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type IndustryType =
  | 'iron_factory'
  | 'plastic_factory'
  | 'warehouse'
  | 'retail_store'
  | 'distributor'
  | 'wholesale'
  | 'fmcg'
  | 'manufacturing'
  | 'other';

export type SubscriptionPlan = 'free_trial' | 'basic' | 'standard' | 'premium';

export interface CompanySettings {
  currency?: string;
  dateFormat?: string;
  timezone?: string;
  brandColor?: string;
  language?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

// Product types
export interface Product {
  _id: string;
  companyId: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  categoryId?: string;
  price: number;
  costPrice: number;
  taxPercentage: number;
  unit: string;
  images: string[];
  minStockLevel: number;
  reorderThreshold: number;
  currentStock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Category types
export interface Category {
  _id: string;
  companyId: string;
  name: string;
  description?: string;
  parentCategoryId?: string;
  isActive: boolean;
}

// Customer types
export interface Customer {
  _id: string;
  companyId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: Address;
  gstNumber?: string;
  creditBalance: number;
  totalPurchases: number;
  outstandingAmount: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Vendor types
export interface Vendor {
  _id: string;
  companyId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: Address;
  gstNumber?: string;
  rating: number;
  totalOrders: number;
  totalAmount: number;
  contactPerson?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Warehouse types
export interface Warehouse {
  _id: string;
  companyId: string;
  name: string;
  address?: Address;
  managerId?: string;
  capacity?: number;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Purchase types
export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxPercentage: number;
  taxAmount: number;
  totalPrice: number;
}

export interface Purchase {
  _id: string;
  companyId: string;
  purchaseNumber: string;
  vendorId: string;
  warehouseId?: string;
  items: PurchaseItem[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  status: 'draft' | 'pending' | 'approved' | 'received' | 'cancelled';
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paidAmount: number;
  expectedDeliveryDate?: string;
  receivedDate?: string;
  notes?: string;
  createdBy?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Sale types
export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxPercentage: number;
  taxAmount: number;
  discount: number;
  totalPrice: number;
}

export interface Sale {
  _id: string;
  companyId: string;
  saleNumber: string;
  customerId: string;
  warehouseId?: string;
  items: SaleItem[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  status: 'draft' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded';
  paidAmount: number;
  deliveryDate?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  companyName: string;
  industry: IndustryType;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  company: Company;
}

// Dashboard types
export interface DashboardStats {
  totalProducts: number;
  totalCustomers: number;
  totalVendors: number;
  totalStockValue: number;
  totalSalesAmount: number;
  totalPurchaseAmount: number;
  profitLoss: number;
  lowStockItems: number;
  pendingPayments: number;
  recentActivities: ActivityLog[];
  monthlySales: { month: string; amount: number }[];
  monthlyPurchases: { month: string; amount: number }[];
  topProducts: { name: string; quantity: number }[];
}

// Activity log types
export interface ActivityLog {
  _id: string;
  companyId: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, any>;
  createdAt: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
