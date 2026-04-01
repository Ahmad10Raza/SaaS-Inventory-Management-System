/**
 * INDUSTRY CONFIG ENGINE
 *
 * The single source of truth that maps each industry type to its
 * default settings across all 7 tenant-level config collections.
 *
 * When a new company is provisioned, the provisioner calls:
 *   getIndustryDefaults(industry)
 * and uses the result to seed every settings collection.
 *
 * Company admins can override any of these later from the Settings page.
 */

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface IndustryDefaults {
  industry: IndustrySettingsDefaults;
  inventory: InventorySettingsDefaults;
  product: ProductSettingsDefaults;
  tax: TaxSettingsDefaults;
  warehouse: WarehouseSettingsDefaults;
  approval: ApprovalSettingsDefaults;
  notification: NotificationSettingsDefaults;
  branding: BrandingSettingsDefaults;
  dashboardWidgets: WidgetSeed[];
  extraRoles: RoleSeed[];
}

export interface IndustrySettingsDefaults {
  enabledModules: string[];
  enabledTrackingTypes: string[];
  enabledApprovalFlows: string[];
  enabledNotificationTypes: string[];
  enabledReports: string[];
}

export interface InventorySettingsDefaults {
  multiWarehouseEnabled: boolean;
  negativeStockAllowed: boolean;
  autoReorderEnabled: boolean;
  reorderThresholdDefault: number;
  stockReservationEnabled: boolean;
  batchTrackingEnabled: boolean;
  serialTrackingEnabled: boolean;
  expiryTrackingEnabled: boolean;
  damagedStockWorkflowEnabled: boolean;
  transferApprovalRequired: boolean;
}

export interface ProductSettingsDefaults {
  dynamicAttributesEnabled: boolean;
  variantSupportEnabled: boolean;
  barcodeGenerationEnabled: boolean;
  skuAutoGenerationEnabled: boolean;
  qrCodeEnabled: boolean;
  unitConversionEnabled: boolean;
  comboProductEnabled: boolean;
  bundleProductEnabled: boolean;
  bomEnabled: boolean;
}

export interface TaxSettingsDefaults {
  gstEnabled: boolean;
  defaultGSTPercent: number;
  taxInclusivePricing: boolean;
  invoicePrefix: string;
  purchaseOrderPrefix: string;
  salesOrderPrefix: string;
  currencySymbol: string;
  decimalPlaces: number;
  paymentTerms: number;
  creditLimitEnabled: boolean;
}

export interface WarehouseSettingsDefaults {
  multiWarehouseEnabled: boolean;
  warehouseTransferEnabled: boolean;
  rackManagementEnabled: boolean;
  binLocationEnabled: boolean;
  warehouseApprovalRequired: boolean;
}

export interface ApprovalSettingsDefaults {
  roleBasedAccessEnabled: boolean;
  purchaseApprovalRequired: boolean;
  salesDiscountApprovalRequired: boolean;
  inventoryAdjustmentApprovalRequired: boolean;
  stockTransferApprovalRequired: boolean;
}

export interface NotificationSettingsDefaults {
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  whatsappNotificationsEnabled: boolean;
  lowStockAlertsEnabled: boolean;
  expiryAlertsEnabled: boolean;
  paymentRemindersEnabled: boolean;
  dailySummaryEnabled: boolean;
}

export interface BrandingSettingsDefaults {
  sidebarColor: string;
  themeColor: string;
  darkModeDefault: boolean;
}

export interface WidgetSeed {
  widgetKey: string;
  title: string;
  icon: string;
  order: number;
}

export interface RoleSeed {
  name: string;
  displayName: string;
  permissions: string[];
}

// ─────────────────────────────────────────────────────────
// Shared Defaults
// ─────────────────────────────────────────────────────────

const COMMON_WIDGETS: WidgetSeed[] = [
  { widgetKey: 'total_products', title: 'Total Products', icon: 'Package', order: 1 },
  { widgetKey: 'total_stock_value', title: 'Total Stock Value', icon: 'TrendingUp', order: 2 },
  { widgetKey: 'total_sales', title: 'Total Sales', icon: 'ShoppingCart', order: 3 },
  { widgetKey: 'low_stock_alerts', title: 'Low Stock Alerts', icon: 'AlertTriangle', order: 4 },
  { widgetKey: 'pending_payments', title: 'Pending Payments', icon: 'Clock', order: 5 },
  { widgetKey: 'total_customers', title: 'Total Customers', icon: 'Users', order: 6 },
];

const BASE_TAX: TaxSettingsDefaults = {
  gstEnabled: true,
  defaultGSTPercent: 18,
  taxInclusivePricing: false,
  invoicePrefix: 'INV',
  purchaseOrderPrefix: 'PO',
  salesOrderPrefix: 'SO',
  currencySymbol: '₹',
  decimalPlaces: 2,
  paymentTerms: 30,
  creditLimitEnabled: false,
};

const BASE_NOTIFICATION: NotificationSettingsDefaults = {
  emailNotificationsEnabled: true,
  smsNotificationsEnabled: false,
  whatsappNotificationsEnabled: false,
  lowStockAlertsEnabled: true,
  expiryAlertsEnabled: false,
  paymentRemindersEnabled: true,
  dailySummaryEnabled: false,
};

const BASE_BRANDING: BrandingSettingsDefaults = {
  sidebarColor: '#6366f1',
  themeColor: '#6366f1',
  darkModeDefault: false,
};

// ─────────────────────────────────────────────────────────
// Per-Industry Configurations
// ─────────────────────────────────────────────────────────

const ELECTRONICS_STORE: IndustryDefaults = {
  industry: {
    enabledModules: ['serial_tracking', 'imei_tracking', 'warranty', 'repair', 'brand_management', 'variants', 'bundles'],
    enabledTrackingTypes: ['serial', 'imei', 'warranty'],
    enabledApprovalFlows: ['purchase_approval'],
    enabledNotificationTypes: ['low_stock', 'warranty_expiry', 'payment_reminder'],
    enabledReports: ['stock_summary', 'sales_report', 'warranty_report', 'brand_performance'],
  },
  inventory: {
    multiWarehouseEnabled: false,
    negativeStockAllowed: false,
    autoReorderEnabled: true,
    reorderThresholdDefault: 5,
    stockReservationEnabled: true,
    batchTrackingEnabled: false,
    serialTrackingEnabled: true,
    expiryTrackingEnabled: false,
    damagedStockWorkflowEnabled: true,
    transferApprovalRequired: false,
  },
  product: {
    dynamicAttributesEnabled: true,
    variantSupportEnabled: true,
    barcodeGenerationEnabled: true,
    skuAutoGenerationEnabled: true,
    qrCodeEnabled: true,
    unitConversionEnabled: false,
    comboProductEnabled: false,
    bundleProductEnabled: true,
    bomEnabled: false,
  },
  tax: { ...BASE_TAX },
  warehouse: {
    multiWarehouseEnabled: false,
    warehouseTransferEnabled: false,
    rackManagementEnabled: true,
    binLocationEnabled: true,
    warehouseApprovalRequired: false,
  },
  approval: {
    roleBasedAccessEnabled: true,
    purchaseApprovalRequired: true,
    salesDiscountApprovalRequired: true,
    inventoryAdjustmentApprovalRequired: false,
    stockTransferApprovalRequired: false,
  },
  notification: { ...BASE_NOTIFICATION, expiryAlertsEnabled: false },
  branding: BASE_BRANDING,
  dashboardWidgets: [
    ...COMMON_WIDGETS,
    { widgetKey: 'warranty_expiring', title: 'Warranties Expiring', icon: 'ShieldAlert', order: 7 },
    { widgetKey: 'repair_tickets', title: 'Active Repairs', icon: 'Wrench', order: 8 },
  ],
  extraRoles: [
    { name: 'repair_technician', displayName: 'Repair Technician', permissions: ['products.read', 'inventory.read', 'repairs.read', 'repairs.write'] },
  ],
};

const CLOTHING_STORE: IndustryDefaults = {
  industry: {
    enabledModules: ['size_matrix', 'color_variants', 'seasonal_collections', 'fabric_attributes', 'variants', 'barcode'],
    enabledTrackingTypes: ['barcode'],
    enabledApprovalFlows: ['discount_approval'],
    enabledNotificationTypes: ['low_stock', 'payment_reminder'],
    enabledReports: ['stock_summary', 'sales_report', 'category_performance', 'seasonal_report'],
  },
  inventory: {
    multiWarehouseEnabled: false,
    negativeStockAllowed: false,
    autoReorderEnabled: true,
    reorderThresholdDefault: 10,
    stockReservationEnabled: false,
    batchTrackingEnabled: false,
    serialTrackingEnabled: false,
    expiryTrackingEnabled: false,
    damagedStockWorkflowEnabled: false,
    transferApprovalRequired: false,
  },
  product: {
    dynamicAttributesEnabled: true,
    variantSupportEnabled: true,
    barcodeGenerationEnabled: true,
    skuAutoGenerationEnabled: true,
    qrCodeEnabled: false,
    unitConversionEnabled: false,
    comboProductEnabled: false,
    bundleProductEnabled: false,
    bomEnabled: false,
  },
  tax: { ...BASE_TAX },
  warehouse: {
    multiWarehouseEnabled: false,
    warehouseTransferEnabled: false,
    rackManagementEnabled: true,
    binLocationEnabled: false,
    warehouseApprovalRequired: false,
  },
  approval: {
    roleBasedAccessEnabled: true,
    purchaseApprovalRequired: false,
    salesDiscountApprovalRequired: true,
    inventoryAdjustmentApprovalRequired: false,
    stockTransferApprovalRequired: false,
  },
  notification: BASE_NOTIFICATION,
  branding: { ...BASE_BRANDING, themeColor: '#ec4899', sidebarColor: '#ec4899' },
  dashboardWidgets: [
    ...COMMON_WIDGETS,
    { widgetKey: 'seasonal_trends', title: 'Seasonal Trends', icon: 'CalendarDays', order: 7 },
  ],
  extraRoles: [],
};

const PHARMACY: IndustryDefaults = {
  industry: {
    enabledModules: ['batch_tracking', 'expiry_tracking', 'drug_license', 'manufacturer', 'prescription_flag', 'batch_pricing'],
    enabledTrackingTypes: ['batch', 'expiry'],
    enabledApprovalFlows: ['purchase_approval', 'inventory_adjustment_approval'],
    enabledNotificationTypes: ['low_stock', 'expiry_alert', 'payment_reminder'],
    enabledReports: ['stock_summary', 'expiry_report', 'batch_report', 'sales_report', 'near_expiry_report'],
  },
  inventory: {
    multiWarehouseEnabled: false,
    negativeStockAllowed: false,
    autoReorderEnabled: true,
    reorderThresholdDefault: 15,
    stockReservationEnabled: false,
    batchTrackingEnabled: true,
    serialTrackingEnabled: false,
    expiryTrackingEnabled: true,
    damagedStockWorkflowEnabled: true,
    transferApprovalRequired: false,
  },
  product: {
    dynamicAttributesEnabled: true,
    variantSupportEnabled: false,
    barcodeGenerationEnabled: true,
    skuAutoGenerationEnabled: true,
    qrCodeEnabled: false,
    unitConversionEnabled: true,
    comboProductEnabled: false,
    bundleProductEnabled: false,
    bomEnabled: false,
  },
  tax: { ...BASE_TAX, defaultGSTPercent: 12 },
  warehouse: {
    multiWarehouseEnabled: false,
    warehouseTransferEnabled: false,
    rackManagementEnabled: true,
    binLocationEnabled: true,
    warehouseApprovalRequired: false,
  },
  approval: {
    roleBasedAccessEnabled: true,
    purchaseApprovalRequired: true,
    salesDiscountApprovalRequired: false,
    inventoryAdjustmentApprovalRequired: true,
    stockTransferApprovalRequired: false,
  },
  notification: { ...BASE_NOTIFICATION, expiryAlertsEnabled: true, dailySummaryEnabled: true },
  branding: { ...BASE_BRANDING, themeColor: '#10b981', sidebarColor: '#10b981' },
  dashboardWidgets: [
    ...COMMON_WIDGETS,
    { widgetKey: 'expiring_soon', title: 'Expiring Soon (30d)', icon: 'Timer', order: 7 },
    { widgetKey: 'expired_stock', title: 'Expired Stock', icon: 'AlertOctagon', order: 8 },
  ],
  extraRoles: [
    { name: 'pharmacist', displayName: 'Pharmacist', permissions: ['products.read', 'products.write', 'inventory.read', 'inventory.write', 'sales.read', 'sales.write', 'dashboard.read'] },
  ],
};

const IRON_FACTORY: IndustryDefaults = {
  industry: {
    enabledModules: ['raw_materials', 'weight_based', 'thickness_based', 'grade_pricing', 'bom', 'production', 'warehouse_transfers'],
    enabledTrackingTypes: ['batch', 'weight'],
    enabledApprovalFlows: ['purchase_approval', 'stock_transfer_approval', 'inventory_adjustment_approval'],
    enabledNotificationTypes: ['low_stock', 'payment_reminder', 'production_complete'],
    enabledReports: ['stock_summary', 'production_report', 'raw_material_report', 'wastage_report', 'sales_report'],
  },
  inventory: {
    multiWarehouseEnabled: true,
    negativeStockAllowed: false,
    autoReorderEnabled: true,
    reorderThresholdDefault: 50,
    stockReservationEnabled: true,
    batchTrackingEnabled: true,
    serialTrackingEnabled: false,
    expiryTrackingEnabled: false,
    damagedStockWorkflowEnabled: true,
    transferApprovalRequired: true,
  },
  product: {
    dynamicAttributesEnabled: true,
    variantSupportEnabled: false,
    barcodeGenerationEnabled: false,
    skuAutoGenerationEnabled: true,
    qrCodeEnabled: false,
    unitConversionEnabled: true,
    comboProductEnabled: false,
    bundleProductEnabled: false,
    bomEnabled: true,
  },
  tax: { ...BASE_TAX, defaultGSTPercent: 18 },
  warehouse: {
    multiWarehouseEnabled: true,
    warehouseTransferEnabled: true,
    rackManagementEnabled: false,
    binLocationEnabled: false,
    warehouseApprovalRequired: true,
  },
  approval: {
    roleBasedAccessEnabled: true,
    purchaseApprovalRequired: true,
    salesDiscountApprovalRequired: false,
    inventoryAdjustmentApprovalRequired: true,
    stockTransferApprovalRequired: true,
  },
  notification: { ...BASE_NOTIFICATION, dailySummaryEnabled: true },
  branding: { ...BASE_BRANDING, themeColor: '#78716c', sidebarColor: '#44403c' },
  dashboardWidgets: [
    ...COMMON_WIDGETS,
    { widgetKey: 'production_output', title: 'Production Output', icon: 'Factory', order: 7 },
    { widgetKey: 'raw_material_stock', title: 'Raw Materials', icon: 'Layers', order: 8 },
  ],
  extraRoles: [
    { name: 'production_manager', displayName: 'Production Manager', permissions: ['products.read', 'inventory.read', 'inventory.write', 'production.read', 'production.write', 'warehouses.read', 'dashboard.read'] },
    { name: 'quality_inspector', displayName: 'Quality Inspector', permissions: ['products.read', 'inventory.read', 'production.read', 'quality.read', 'quality.write', 'dashboard.read'] },
  ],
};

const PLASTIC_FACTORY: IndustryDefaults = {
  ...IRON_FACTORY,
  industry: {
    enabledModules: ['diameter_based', 'length_based', 'pressure_grade', 'material_type', 'production', 'warehouse_transfers'],
    enabledTrackingTypes: ['batch'],
    enabledApprovalFlows: ['purchase_approval', 'stock_transfer_approval'],
    enabledNotificationTypes: ['low_stock', 'payment_reminder', 'production_complete'],
    enabledReports: ['stock_summary', 'production_report', 'sales_report', 'wastage_report'],
  },
  branding: { ...BASE_BRANDING, themeColor: '#0ea5e9', sidebarColor: '#0369a1' },
};

const GROCERY_STORE: IndustryDefaults = {
  industry: {
    enabledModules: ['weight_based_pricing', 'expiry_tracking', 'batch_tracking', 'barcode', 'categories'],
    enabledTrackingTypes: ['batch', 'expiry', 'barcode'],
    enabledApprovalFlows: [],
    enabledNotificationTypes: ['low_stock', 'expiry_alert', 'payment_reminder'],
    enabledReports: ['stock_summary', 'sales_report', 'expiry_report', 'category_performance'],
  },
  inventory: {
    multiWarehouseEnabled: false,
    negativeStockAllowed: false,
    autoReorderEnabled: true,
    reorderThresholdDefault: 20,
    stockReservationEnabled: false,
    batchTrackingEnabled: true,
    serialTrackingEnabled: false,
    expiryTrackingEnabled: true,
    damagedStockWorkflowEnabled: true,
    transferApprovalRequired: false,
  },
  product: {
    dynamicAttributesEnabled: false,
    variantSupportEnabled: false,
    barcodeGenerationEnabled: true,
    skuAutoGenerationEnabled: true,
    qrCodeEnabled: false,
    unitConversionEnabled: true,
    comboProductEnabled: false,
    bundleProductEnabled: false,
    bomEnabled: false,
  },
  tax: { ...BASE_TAX, defaultGSTPercent: 5 },
  warehouse: {
    multiWarehouseEnabled: false,
    warehouseTransferEnabled: false,
    rackManagementEnabled: true,
    binLocationEnabled: false,
    warehouseApprovalRequired: false,
  },
  approval: {
    roleBasedAccessEnabled: true,
    purchaseApprovalRequired: false,
    salesDiscountApprovalRequired: false,
    inventoryAdjustmentApprovalRequired: false,
    stockTransferApprovalRequired: false,
  },
  notification: { ...BASE_NOTIFICATION, expiryAlertsEnabled: true },
  branding: { ...BASE_BRANDING, themeColor: '#22c55e', sidebarColor: '#15803d' },
  dashboardWidgets: [
    ...COMMON_WIDGETS,
    { widgetKey: 'expiring_soon', title: 'Expiring Soon (7d)', icon: 'Timer', order: 7 },
  ],
  extraRoles: [],
};

/** Generic fallback for retail_store, distributor, wholesale, fmcg, manufacturing, other */
const GENERIC: IndustryDefaults = {
  industry: {
    enabledModules: ['barcode', 'categories'],
    enabledTrackingTypes: [],
    enabledApprovalFlows: [],
    enabledNotificationTypes: ['low_stock', 'payment_reminder'],
    enabledReports: ['stock_summary', 'sales_report', 'purchase_report'],
  },
  inventory: {
    multiWarehouseEnabled: false,
    negativeStockAllowed: false,
    autoReorderEnabled: false,
    reorderThresholdDefault: 10,
    stockReservationEnabled: false,
    batchTrackingEnabled: false,
    serialTrackingEnabled: false,
    expiryTrackingEnabled: false,
    damagedStockWorkflowEnabled: false,
    transferApprovalRequired: false,
  },
  product: {
    dynamicAttributesEnabled: false,
    variantSupportEnabled: false,
    barcodeGenerationEnabled: false,
    skuAutoGenerationEnabled: true,
    qrCodeEnabled: false,
    unitConversionEnabled: false,
    comboProductEnabled: false,
    bundleProductEnabled: false,
    bomEnabled: false,
  },
  tax: BASE_TAX,
  warehouse: {
    multiWarehouseEnabled: false,
    warehouseTransferEnabled: false,
    rackManagementEnabled: false,
    binLocationEnabled: false,
    warehouseApprovalRequired: false,
  },
  approval: {
    roleBasedAccessEnabled: true,
    purchaseApprovalRequired: false,
    salesDiscountApprovalRequired: false,
    inventoryAdjustmentApprovalRequired: false,
    stockTransferApprovalRequired: false,
  },
  notification: BASE_NOTIFICATION,
  branding: BASE_BRANDING,
  dashboardWidgets: COMMON_WIDGETS,
  extraRoles: [],
};

// ─────────────────────────────────────────────────────────
// Lookup Map
// ─────────────────────────────────────────────────────────

const INDUSTRY_MAP: Record<string, IndustryDefaults> = {
  electronics_store: ELECTRONICS_STORE,
  clothing_store: CLOTHING_STORE,
  pharmacy: PHARMACY,
  grocery_store: GROCERY_STORE,
  iron_factory: IRON_FACTORY,
  plastic_factory: PLASTIC_FACTORY,
  // Aliases — these all use the generic config
  retail_store: GENERIC,
  warehouse: { ...GENERIC, warehouse: { ...GENERIC.warehouse, multiWarehouseEnabled: true, warehouseTransferEnabled: true } },
  distributor: { ...GENERIC, inventory: { ...GENERIC.inventory, multiWarehouseEnabled: true }, warehouse: { ...GENERIC.warehouse, multiWarehouseEnabled: true, warehouseTransferEnabled: true } },
  wholesale: { ...GENERIC, approval: { ...GENERIC.approval, purchaseApprovalRequired: true }, tax: { ...GENERIC.tax, creditLimitEnabled: true } },
  fmcg: { ...GENERIC, inventory: { ...GENERIC.inventory, batchTrackingEnabled: true, expiryTrackingEnabled: true }, notification: { ...GENERIC.notification, expiryAlertsEnabled: true } },
  manufacturing: IRON_FACTORY,
  platform_management: GENERIC,
  other: GENERIC,
};

// ─────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────

/**
 * Returns the full set of default settings for a given industry.
 * Falls back to GENERIC if industry is unknown.
 */
export function getIndustryDefaults(industry: string): IndustryDefaults {
  return INDUSTRY_MAP[industry] || GENERIC;
}

/**
 * Merges user-provided feature preferences with industry defaults.
 * Used during registration Step 2 to override specific toggles.
 */
export function mergeWithPreferences(
  defaults: IndustryDefaults,
  preferences?: {
    batchTracking?: boolean;
    serialTracking?: boolean;
    expiryTracking?: boolean;
    manufacturingModule?: boolean;
    warehouseTransfers?: boolean;
    approvalWorkflow?: boolean;
  },
): IndustryDefaults {
  if (!preferences) return defaults;

  const merged = JSON.parse(JSON.stringify(defaults)) as IndustryDefaults;

  if (preferences.batchTracking !== undefined) {
    merged.inventory.batchTrackingEnabled = preferences.batchTracking;
  }
  if (preferences.serialTracking !== undefined) {
    merged.inventory.serialTrackingEnabled = preferences.serialTracking;
  }
  if (preferences.expiryTracking !== undefined) {
    merged.inventory.expiryTrackingEnabled = preferences.expiryTracking;
    merged.notification.expiryAlertsEnabled = preferences.expiryTracking;
  }
  if (preferences.manufacturingModule !== undefined) {
    merged.product.bomEnabled = preferences.manufacturingModule;
    if (preferences.manufacturingModule && !merged.industry.enabledModules.includes('bom')) {
      merged.industry.enabledModules.push('bom', 'production');
    }
  }
  if (preferences.warehouseTransfers !== undefined) {
    merged.warehouse.warehouseTransferEnabled = preferences.warehouseTransfers;
    merged.warehouse.multiWarehouseEnabled = preferences.warehouseTransfers;
    merged.inventory.multiWarehouseEnabled = preferences.warehouseTransfers;
  }
  if (preferences.approvalWorkflow !== undefined) {
    merged.approval.purchaseApprovalRequired = preferences.approvalWorkflow;
    merged.approval.inventoryAdjustmentApprovalRequired = preferences.approvalWorkflow;
  }

  return merged;
}
