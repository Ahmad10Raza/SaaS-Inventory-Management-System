import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { Company, CompanyDocument } from '../../schemas/company.schema';
import { TenantConnectionService } from '../../database/tenant-connection.service';
import { getIndustryDefaults, mergeWithPreferences } from '../../config/industry-config';

export interface ProvisionResult {
  company: any;
  adminUser: any;
  databaseName: string;
  companyId: string;
  tenantId: string;
}

export interface ProvisionParams {
  companyName: string;
  industry: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  businessType?: string;
  country?: string;
  currency?: string;
  warehouseCount?: number;
  employeeCount?: number;
  expectedProductCount?: number;
  featurePreferences?: {
    batchTracking?: boolean;
    serialTracking?: boolean;
    expiryTracking?: boolean;
    manufacturingModule?: boolean;
    warehouseTransfers?: boolean;
    approvalWorkflow?: boolean;
  };
}

@Injectable()
export class TenantProvisionerService {
  private readonly logger = new Logger(TenantProvisionerService.name);

  constructor(
    @InjectModel(Company.name) private readonly companyModel: Model<CompanyDocument>,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {}

  async provisionNewTenant(params: ProvisionParams): Promise<ProvisionResult> {
    this.logger.log(`Starting tenant provisioning for: ${params.companyName}`);

    // Step 1: Generate IDs
    const companyId = await this.generateCompanyId();
    const tenantId = `TENANT-${uuidv4().toUpperCase().slice(0, 8)}`;

    const dbSlug = params.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '')
      .substring(0, 15);
    const databaseName = `inv_${dbSlug}_${companyId.toLowerCase()}`;

    const slug = params.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const existingSlug = await this.companyModel.findOne({ slug });
    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

    // Step 2: Save company record in Master DB
    const company = await this.companyModel.create({
      companyId,
      tenantId,
      databaseName,
      name: params.companyName,
      slug: finalSlug,
      industry: params.industry,
      businessType: params.businessType || 'other',
      ownerEmail: params.email.toLowerCase(),
      currency: params.currency || 'INR',
      address: { country: params.country || 'India' },
      warehouseCount: params.warehouseCount || 1,
      employeeCount: params.employeeCount || 1,
      expectedProductCount: params.expectedProductCount || 100,
      subscriptionPlan: 'free_trial',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      isActive: true,
    });

    this.logger.log(`Company record created in Master DB: ${companyId}`);

    // Step 3: Connect to the new tenant DB
    const conn = await this.tenantConnectionService.getConnection(databaseName);

    // Step 4: Resolve industry defaults & merge user preferences
    const rawDefaults = getIndustryDefaults(params.industry);
    const config = mergeWithPreferences(rawDefaults, params.featurePreferences);

    // Step 5: Seed the tenant database
    await this.seedTenantDatabase(conn, params, company, config);

    // Step 6: Create admin user in the tenant DB
    const hashedPassword = await bcrypt.hash(params.password, 12);
    const UserModel = conn.model('User');

    const adminUser = await UserModel.create({
      companyId: company._id,
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email.toLowerCase(),
      password: hashedPassword,
      phone: params.phone,
      role: 'company_owner',
      permissions: ['*'],
      isActive: true,
      isTemporaryPassword: true,
    });

    this.logger.log(`Tenant ${databaseName} fully provisioned. Admin: ${params.email}`);

    return {
      company: company.toObject(),
      adminUser: (() => {
        const u: any = (adminUser as any).toObject();
        delete u.password;
        return u;
      })(),
      databaseName,
      companyId,
      tenantId,
    };
  }

  // ────────────────────────────────────────────────────────
  // Seed the fresh tenant DB with industry-aware data
  // ────────────────────────────────────────────────────────
  private async seedTenantDatabase(conn: any, params: any, company: any, config: any): Promise<void> {
    this.logger.log(`Seeding tenant DB: ${company.databaseName} (industry: ${params.industry})`);

    // ── 1. Roles (base + industry-specific) ──────────────
    const RoleModel = conn.model('Role');
    const baseRoles = [
      { name: 'company_owner', displayName: 'Company Owner', permissions: ['*'], isDefault: false, isSystem: true },
      { name: 'inventory_manager', displayName: 'Inventory Manager', permissions: [
        'products.read', 'products.write', 'products.update', 'products.delete',
        'categories.read', 'categories.write', 'categories.update', 'categories.delete',
        'inventory.read', 'inventory.write', 'inventory.update',
        'warehouses.read', 'warehouses.write',
        'vendors.read', 'purchases.read', 'purchases.write', 'reports.read', 'dashboard.read',
      ], isDefault: true, isSystem: true },
      { name: 'sales_manager', displayName: 'Sales Manager', permissions: [
        'products.read', 'categories.read', 'inventory.read',
        'customers.read', 'customers.write', 'customers.update',
        'sales.read', 'sales.write', 'sales.update', 'reports.read', 'dashboard.read',
      ], isDefault: true, isSystem: true },
      { name: 'purchase_manager', displayName: 'Purchase Manager', permissions: [
        'products.read', 'categories.read', 'inventory.read',
        'vendors.read', 'vendors.write', 'vendors.update',
        'purchases.read', 'purchases.write', 'purchases.update', 'reports.read', 'dashboard.read',
      ], isDefault: true, isSystem: true },
      { name: 'staff', displayName: 'Staff User', permissions: [
        'products.read', 'inventory.read', 'customers.read',
        'vendors.read', 'warehouses.read', 'purchases.read', 'sales.read', 'dashboard.read',
      ], isDefault: true, isSystem: true },
      { name: 'read_only', displayName: 'Read Only User', permissions: [
        'products.read', 'inventory.read', 'customers.read',
        'vendors.read', 'warehouses.read', 'purchases.read', 'sales.read',
        'reports.read', 'dashboard.read',
      ], isDefault: true, isSystem: true },
    ];
    const extraRoles = (config.extraRoles || []).map((r: any) => ({ ...r, isDefault: true, isSystem: true }));
    await RoleModel.insertMany([...baseRoles, ...extraRoles].map(role => ({ ...role, companyId: company._id })));

    // ── 2. Dashboard Widgets (industry-aware) ────────────
    const WidgetModel = conn.model('DashboardWidget');
    await WidgetModel.insertMany(config.dashboardWidgets.map((w: any) => ({ ...w, companyId: company._id })));

    // ── 3. Legacy key-value Settings ─────────────────────
    const SettingsModel = conn.model('Settings');
    await SettingsModel.insertMany([
      { key: 'currency', value: params.currency || 'INR', category: 'financial' },
      { key: 'currency_symbol', value: config.tax.currencySymbol || '₹', category: 'financial' },
      { key: 'date_format', value: 'DD/MM/YYYY', category: 'display' },
      { key: 'timezone', value: 'Asia/Kolkata', category: 'display' },
      { key: 'language', value: 'en', category: 'display' },
      { key: 'low_stock_threshold', value: config.inventory.reorderThresholdDefault, category: 'inventory' },
      { key: 'invoice_prefix', value: config.tax.invoicePrefix, category: 'sales' },
      { key: 'sale_prefix', value: 'SL', category: 'sales' },
      { key: 'purchase_prefix', value: config.tax.purchaseOrderPrefix, category: 'purchases' },
    ].map(s => ({ ...s, companyId: company._id })));

    // ── 4–11. Seed all 7+1 industry-aware settings ───────
    await conn.model('IndustrySettings').create({ companyId: company._id, industryType: params.industry, ...config.industry });
    await conn.model('InventorySettings').create({ companyId: company._id, ...config.inventory });
    await conn.model('ProductSettings').create({ companyId: company._id, ...config.product });
    await conn.model('TaxSettings').create({ companyId: company._id, ...config.tax });
    await conn.model('WarehouseConfig').create({ companyId: company._id, ...config.warehouse });
    await conn.model('ApprovalSettings').create({ companyId: company._id, ...config.approval });
    await conn.model('NotificationConfig').create({ companyId: company._id, ...config.notification });
    await conn.model('BrandingSettings').create({ companyId: company._id, ...config.branding });

    this.logger.log(`✅ Seed complete for: ${company.databaseName} (${config.industry.enabledModules.length} modules)`);
  }

  // ────────────────────────────────────────────────────────
  // Generate the next sequential company ID (CMP001…)
  // ────────────────────────────────────────────────────────
  private async generateCompanyId(): Promise<string> {
    const lastCompany = await this.companyModel.findOne(
      { companyId: { $regex: /^CMP\d+$/ } },
      {},
      { sort: { companyId: -1 } },
    );
    let nextNum = 1;
    if (lastCompany && lastCompany.companyId) {
      const match = lastCompany.companyId.match(/\d+/);
      if (match) nextNum = parseInt(match[0], 10) + 1;
    }
    return `CMP${String(nextNum).padStart(3, '0')}`;
  }
}
