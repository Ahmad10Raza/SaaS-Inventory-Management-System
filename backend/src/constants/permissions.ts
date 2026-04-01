// Permission format: 'module.action' e.g. 'product.create', 'inventory.view'
export const PERMISSIONS_KEY = 'permissions';

// Role hierarchy - higher roles inherit all lower permissions
export const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 100,
  company_owner: 90,
  inventory_manager: 70,
  sales_manager: 70,
  purchase_manager: 70,
  warehouse_manager: 70,
  accountant: 60,
  staff: 30,
  read_only: 10,
};

// Default permissions per role as per user requirements
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'],
  company_owner: ['*'],
  inventory_manager: [
    'product.create', 'product.update', 'product.delete', 'product.view',
    'inventory.view', 'inventory.add_stock', 'inventory.reduce_stock', 'inventory.transfer_stock',
    'inventory.adjust', 'reports.view', 'dashboard.view'
  ],
  sales_manager: [
    'sales.create', 'sales.update', 'sales.cancel', 'sales.view', 'sales.approve_return',
    'customer.view', 'customer.create', 'customer.update',
    'product.view', 'inventory.view', 'reports.view', 'dashboard.view'
  ],
  purchase_manager: [
    'purchase.create', 'purchase.update', 'purchase.cancel', 'purchase.view', 'purchase.approve_received',
    'vendor.view', 'vendor.create', 'vendor.update',
    'product.view', 'inventory.view', 'reports.view', 'dashboard.view'
  ],
  warehouse_manager: [
    'inventory.view', 'inventory.transfer_stock', 'inventory.add_stock', 'inventory.reduce_stock',
    'warehouse.view', 'warehouse.update_location', 'reports.view', 'dashboard.view'
  ],
  accountant: [
    'sales.view', 'purchase.view', 'billing.view', 'reports.view',
    'tax.view', 'tax.calculate', 'customer.view', 'vendor.view', 'dashboard.view'
  ],
  staff: [
    'product.view', 'inventory.view', 'customer.view', 'vendor.view',
    'sales.create_draft', 'purchase.create_draft', 'dashboard.view'
  ],
  read_only: [
    'product.view', 'inventory.view', 'customer.view', 'reports.view', 'dashboard.view'
  ],
};
