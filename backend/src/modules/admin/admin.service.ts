import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from '../../schemas/company.schema';
import { Subscription, SubscriptionDocument } from '../../schemas/subscription.schema';
import { TenantConnectionService } from '../../database/tenant-connection.service';
import { UpdateCompanyStatusDto, CompanyFilterDto, CreateCompanyDto, UpdateCompanyPlanDto } from './dto/admin.dto';
import { TenantProvisionerService } from '../tenant/tenant-provisioner.service';
import { EmailService } from '../email/email.service';
import { v4 as uuidv4 } from 'uuid';
import { Schema } from 'mongoose';

// Inline user schema for cross-tenant lookups
const UserSchema = new Schema({
  firstName: String,
  lastName: String,
  email: { type: String, lowercase: true },
  role: String,
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
}, { timestamps: true, collection: 'users' });

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  async onModuleInit() {
    const count = await this.companyModel.countDocuments();
    this.logger.log(`\x1b[32m[DIAGNOSTIC] BOOTSTRAP: ${count} companies found in Master DB\x1b[0m`);
    if (count === 0) {
      this.logger.warn('\x1b[31;1m[DIAGNOSTIC] CRITICAL: No companies in saas_master database!\x1b[0m');
    }
  }

  constructor(
    @InjectModel(Company.name) private readonly companyModel: Model<CompanyDocument>,
    @InjectModel(Subscription.name) private readonly subscriptionModel: Model<SubscriptionDocument>,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly provisioner: TenantProvisionerService,
    private readonly emailService: EmailService,
  ) {}

  // ─────────────────────────────────────────────────────
  // LIST ALL COMPANIES
  // ─────────────────────────────────────────────────────
  async listCompanies(filters: CompanyFilterDto) {
    const { search, subscriptionPlan, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
    const query: any = {};

    if (search && search.trim() !== '') {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { companyId: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (subscriptionPlan) query.subscriptionPlan = subscriptionPlan;
    if (isActive !== undefined) query.isActive = isActive;

    const companies = await this.companyModel
      .find(query)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .lean();

    this.logger.log(`[DIAGNOSTIC] listCompanies: found ${companies.length} records matching query: ${JSON.stringify(query)}`);

    // Map companies directly from master DB (skipping expensive cross-DB user counts for the list view)
    const enriched = companies.map((company) => ({
      ...company,
      userCount: 0, // Placeholder: fetch as needed on details page
      trialExpired: company.trialEndsAt ? new Date(company.trialEndsAt) < new Date() : false,
    }));

    return {
      data: enriched,
      total: enriched.length,
    };
  }

  // ─────────────────────────────────────────────────────
  // GET SINGLE COMPANY DETAILS
  // ─────────────────────────────────────────────────────
  async getCompanyDetails(id: string) {
    const company = await this.companyModel.findById(id).lean();
    if (!company) throw new NotFoundException('Company not found');

    // Get subscription info
    const subscription = await this.subscriptionModel
      .findOne({ companyId: company._id })
      .lean();

    // Get users from tenant DB
    let users: any[] = [];
    try {
      if (company.databaseName) {
        const conn = await this.tenantConnectionService.getConnection(company.databaseName);
        const UserModel = conn.modelNames().includes('User')
          ? conn.model('User')
          : conn.model('User', UserSchema);
        users = await UserModel.find().select('-password -refreshToken').lean();
      }
    } catch (err) {
      this.logger.warn(`Could not fetch users for ${company.databaseName}: ${err.message}`);
    }

    return {
      company,
      subscription,
      users,
      stats: {
        userCount: users.length,
        activeUsers: users.filter((u: any) => u.isActive).length,
        trialExpired: company.trialEndsAt ? new Date(company.trialEndsAt) < new Date() : false,
      },
    };
  }

  // ─────────────────────────────────────────────────────
  // ACTIVATE / DEACTIVATE COMPANY
  // ─────────────────────────────────────────────────────
  async updateCompanyStatus(id: string, dto: UpdateCompanyStatusDto) {
    const company = await this.companyModel.findById(id);
    if (!company) throw new NotFoundException('Company not found');

    company.isActive = dto.isActive;
    await company.save();

    this.logger.log(
      `Company ${company.companyId} (${company.name}) ${dto.isActive ? 'activated' : 'deactivated'}. Reason: ${dto.reason || 'N/A'}`,
    );

    return {
      message: `Company ${dto.isActive ? 'activated' : 'deactivated'} successfully`,
      company: company.toObject(),
    };
  }

  // ─────────────────────────────────────────────────────
  // PLATFORM STATISTICS (super-admin dashboard)
  // ─────────────────────────────────────────────────────
  async getPlatformStats() {
    const [
      totalCompanies,
      activeCompanies,
      trialCompanies,
      planDistribution,
    ] = await Promise.all([
      this.companyModel.countDocuments(),
      this.companyModel.countDocuments({ isActive: true }),
      this.companyModel.countDocuments({ subscriptionPlan: 'free_trial' }),
      this.companyModel.aggregate([
        { $group: { _id: '$subscriptionPlan', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const expiredTrials = await this.companyModel.countDocuments({
      subscriptionPlan: 'free_trial',
      trialEndsAt: { $lt: new Date() },
    });

    return {
      totalCompanies,
      activeCompanies,
      inactiveCompanies: totalCompanies - activeCompanies,
      trialCompanies,
      expiredTrials,
      planDistribution: planDistribution.map((p) => ({
        plan: p._id,
        count: p.count,
      })),
      activeConnections: this.tenantConnectionService.getActiveConnectionCount(),
    };
  }

  /** Update a company's subscription plan */
  async updateCompanyPlan(id: string, dto: UpdateCompanyPlanDto) {
    const company = await this.companyModel.findByIdAndUpdate(
      id,
      { subscriptionPlan: dto.plan },
      { new: true, runValidators: true }
    );
    
    if (!company) throw new NotFoundException('Company not found');

    this.logger.log(`[Admin] Plan UPDATED for ${company.name}: -> ${dto.plan}`);

    return {
      message: `Plan for '${company.name}' updated to ${dto.plan}`,
      newPlan: dto.plan,
    };
  }

  // ─────────────────────────────────────────────────────
  // CREATE NEW COMPANY (WITH PROVISIONING & INVITATION)
  // ─────────────────────────────────────────────────────
  async createCompany(dto: CreateCompanyDto) {
    this.logger.log(`Manually creating company: ${dto.name} for ${dto.ownerEmail}`);

    const tempPassword = uuidv4().split('-')[0].toUpperCase();

    try {
      const result = await this.provisioner.provisionNewTenant({
        companyName: dto.name,
        industry: dto.industry,
        firstName: dto.ownerFirstName,
        lastName: dto.ownerLastName,
        email: dto.ownerEmail,
        password: tempPassword,
      });

      // Update plan if specified (provisioner defaults to free_trial)
      if (dto.subscriptionPlan && dto.subscriptionPlan !== 'free_trial') {
        await this.companyModel.findByIdAndUpdate(result.company._id, {
          subscriptionPlan: dto.subscriptionPlan,
        });
      }

      // Send Invitation Email
      await this.emailService.sendStaffInvitation(
        dto.ownerEmail,
        dto.ownerFirstName,
        tempPassword,
        dto.name,
      );

      return {
        message: 'Company created and invitation sent successfully',
        companyId: result.companyId,
        ownerEmail: dto.ownerEmail,
      };
    } catch (err) {
      this.logger.error(`Manual company creation failed: ${err.message}`);
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────
  // DELETE COMPANY (dangerous — super admin only)
  // ─────────────────────────────────────────────────────
  async deleteCompany(id: string) {
    const company = await this.companyModel.findById(id);
    if (!company) throw new NotFoundException('Company not found');

    if (company.isActive) {
      throw new BadRequestException(
        'Cannot delete an active company. Deactivate it first.',
      );
    }

    // Remove subscription record
    await this.subscriptionModel.deleteMany({ companyId: company._id });

    // Remove company record from master DB
    await this.companyModel.findByIdAndDelete(id);

    this.logger.warn(
      `Company ${company.companyId} (${company.name}) DELETED from master DB. Tenant database '${company.databaseName}' was NOT dropped — do so manually if needed.`,
    );

    return {
      message: `Company '${company.name}' deleted from master database. The tenant database '${company.databaseName}' still exists and must be dropped manually from MongoDB Atlas if desired.`,
    };
  }
}
