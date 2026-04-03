import { User, UserSchema } from '../schemas/user.schema';
import { Role, RoleSchema } from '../schemas/role.schema';
import { DashboardWidget, DashboardWidgetSchema } from '../schemas/dashboard-widget.schema';
import { Settings, SettingsSchema } from '../schemas/settings.schema';
import { Product, ProductSchema } from '../schemas/product.schema';
import { Category, CategorySchema } from '../schemas/category.schema';
import { Customer, CustomerSchema } from '../schemas/customer.schema';
import { Vendor, VendorSchema } from '../schemas/vendor.schema';
import { Warehouse, WarehouseSchema } from '../schemas/warehouse.schema';
import { WarehouseStock, WarehouseStockSchema } from '../schemas/warehouse-stock.schema';
import { ProductVariant, ProductVariantSchema } from '../schemas/product-variant.schema';
import { StockMovement, StockMovementSchema } from '../schemas/stock-movement.schema';
import { WarehouseTransfer, WarehouseTransferSchema } from '../schemas/warehouse-transfer.schema';
import { PriceHistory, PriceHistorySchema } from '../schemas/price-history.schema';
import { Purchase, PurchaseSchema } from '../schemas/purchase.schema';
import { Sale, SaleSchema } from '../schemas/sale.schema';
import { Invoice, InvoiceSchema } from '../schemas/invoice.schema';
import { ActivityLog, ActivityLogSchema } from '../schemas/activity-log.schema';
import { Notification, NotificationSchema } from '../schemas/notification.schema';
// ── Industry-aware settings schemas ──────────────────────
import { IndustrySettings, IndustrySettingsSchema } from '../schemas/industry-settings.schema';
import { InventorySettings, InventorySettingsSchema } from '../schemas/inventory-settings.schema';
import { ProductSettings, ProductSettingsSchema } from '../schemas/product-settings.schema';
import { TaxSettings, TaxSettingsSchema } from '../schemas/tax-settings.schema';
import { WarehouseConfig, WarehouseConfigSchema } from '../schemas/warehouse-config.schema';
import { ApprovalSettings, ApprovalSettingsSchema } from '../schemas/approval-settings.schema';
import { NotificationConfig, NotificationConfigSchema } from '../schemas/notification-config.schema';
import { BrandingSettings, BrandingSettingsSchema } from '../schemas/branding-settings.schema';

// ── Dynamic Category Architecture schemas ──────────────
import { CompanyIndustry, CompanyIndustrySchema } from '../schemas/company-industry.schema';
import { CustomCategory, CustomCategorySchema } from '../schemas/custom-category.schema';
import { CategoryTemplate, CategoryTemplateSchema } from '../schemas/category-template.schema';
import { CategoryAttribute, CategoryAttributeSchema } from '../schemas/category-attribute.schema';

export const TENANT_MODELS = [
  { name: User.name, schema: UserSchema },
  { name: Role.name, schema: RoleSchema },
  { name: DashboardWidget.name, schema: DashboardWidgetSchema },
  { name: Settings.name, schema: SettingsSchema },
  { name: Product.name, schema: ProductSchema },
  { name: Category.name, schema: CategorySchema },
  { name: Customer.name, schema: CustomerSchema },
  { name: Vendor.name, schema: VendorSchema },
  { name: Warehouse.name, schema: WarehouseSchema },
  { name: WarehouseStock.name, schema: WarehouseStockSchema },
  { name: ProductVariant.name, schema: ProductVariantSchema },
  { name: StockMovement.name, schema: StockMovementSchema },
  { name: WarehouseTransfer.name, schema: WarehouseTransferSchema },
  { name: PriceHistory.name, schema: PriceHistorySchema },
  { name: Purchase.name, schema: PurchaseSchema },
  { name: Sale.name, schema: SaleSchema },
  { name: Invoice.name, schema: InvoiceSchema },
  { name: ActivityLog.name, schema: ActivityLogSchema },
  { name: Notification.name, schema: NotificationSchema },
  // ── Industry-aware settings ───────────────────────────
  { name: IndustrySettings.name, schema: IndustrySettingsSchema },
  { name: InventorySettings.name, schema: InventorySettingsSchema },
  { name: ProductSettings.name, schema: ProductSettingsSchema },
  { name: TaxSettings.name, schema: TaxSettingsSchema },
  { name: WarehouseConfig.name, schema: WarehouseConfigSchema },
  { name: ApprovalSettings.name, schema: ApprovalSettingsSchema },
  { name: NotificationConfig.name, schema: NotificationConfigSchema },
  { name: BrandingSettings.name, schema: BrandingSettingsSchema },
  // ── Dynamic Categories Architecture ──────────────────
  { name: CompanyIndustry.name, schema: CompanyIndustrySchema },
  { name: CustomCategory.name, schema: CustomCategorySchema },
  { name: CategoryTemplate.name, schema: CategoryTemplateSchema },
  { name: CategoryAttribute.name, schema: CategoryAttributeSchema },
];

