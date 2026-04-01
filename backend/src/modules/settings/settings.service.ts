import { Injectable, NotFoundException, BadRequestException, Inject, Scope } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { REQUEST } from '@nestjs/core';
import { Model, Connection } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Company, CompanyDocument } from '../../schemas/company.schema';
import { User, UserDocument, UserSchema } from '../../schemas/user.schema';
import { UpdateCompanyDto, CreateUserDto, UpdateUserDto } from './dto/settings.dto';
import { EmailService } from '../email/email.service';

@Injectable({ scope: Scope.REQUEST })
export class SettingsService {
  private userModel: Model<UserDocument>;
  private conn: Connection;

  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @Inject(REQUEST) private request: any,
    private emailService: EmailService,
  ) {
    this.conn = this.request.tenantConnection;
    if (!this.conn) throw new Error('Tenant connection not found in request');
    this.userModel = this.conn.modelNames().includes(User.name)
      ? this.conn.model<any>(User.name) as any
      : this.conn.model<any>(User.name, UserSchema) as any;
  }

  // ═══════════════════════════════════════════════════════
  // Company Profile (Master DB)
  // ═══════════════════════════════════════════════════════

  async getCompanyProfile(companyId: string) {
    const company = await this.companyModel.findById(companyId).lean();
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async updateCompanyProfile(companyId: string, dto: UpdateCompanyDto) {
    const updated = await this.companyModel.findByIdAndUpdate(
      companyId,
      { $set: dto },
      { new: true, runValidators: true },
    ).lean();
    if (!updated) throw new NotFoundException('Company not found');
    return updated;
  }

  // ═══════════════════════════════════════════════════════
  // Staff Management (Tenant DB)
  // ═══════════════════════════════════════════════════════

  async getUsers(companyId: string) {
    return this.userModel.find({ companyId }).select('-password').sort({ createdAt: -1 }).lean();
  }

  async createUser(companyId: string, dto: CreateUserDto) {
    const existing = await this.userModel.findOne({ email: dto.email });
    if (existing) throw new BadRequestException('User with this email already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const company = await this.companyModel.findById(companyId);

    const newUser = await this.userModel.create({
      ...dto,
      companyId,
      password: hashedPassword,
      isActive: true,
      isTemporaryPassword: true,
    });

    if (company) {
      try {
        await this.emailService.sendStaffInvitation(dto.email, dto.firstName, dto.password, company.name);
      } catch (err) {
        console.error('Failed to send staff invitation email:', err.message);
      }
    }

    const userObj: any = newUser.toObject();
    delete userObj.password;
    return userObj;
  }

  async updateUser(companyId: string, userId: string, dto: UpdateUserDto) {
    const updateData: any = { ...dto };
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    const checkTarget = await this.userModel.findOne({ _id: userId, companyId });
    if (!checkTarget) throw new NotFoundException('User not found');
    if (checkTarget.role === 'company_owner' && dto.role && dto.role !== 'company_owner') {
      throw new BadRequestException('Cannot demote a company owner.');
    }

    return this.userModel.findOneAndUpdate(
      { _id: userId, companyId },
      { $set: updateData },
      { new: true, runValidators: true },
    ).select('-password').lean();
  }

  async deleteUser(companyId: string, targetUserId: string, requestingUserId: string) {
    if (targetUserId === requestingUserId) throw new BadRequestException('You cannot delete your own account');
    const target = await this.userModel.findOne({ _id: targetUserId, companyId });
    if (!target) throw new NotFoundException('User not found');
    if (target.role === 'company_owner') throw new BadRequestException('Company owners cannot be deleted');
    await this.userModel.deleteOne({ _id: targetUserId, companyId });
    return { message: 'Staff member deleted successfully' };
  }

  // ═══════════════════════════════════════════════════════
  // Industry-Aware Settings (Tenant DB — Singleton Pattern)
  // Each method reads/writes ONE document per tenant.
  // ═══════════════════════════════════════════════════════

  private async getSettingsDoc(modelName: string, companyId: string) {
    const M = this.conn.model(modelName);
    const doc = await M.findOne({ companyId }).lean();
    if (!doc) throw new NotFoundException(`${modelName} not configured for this tenant`);
    return doc;
  }

  private async updateSettingsDoc(modelName: string, companyId: string, dto: Record<string, any>) {
    const M = this.conn.model(modelName);
    const updated = await M.findOneAndUpdate(
      { companyId },
      { $set: dto },
      { new: true, upsert: true, runValidators: true },
    ).lean();
    return updated;
  }

  // ── Industry Settings ──────────────────────────────────
  async getIndustrySettings(companyId: string) {
    return this.getSettingsDoc('IndustrySettings', companyId);
  }
  async updateIndustrySettings(companyId: string, dto: any) {
    return this.updateSettingsDoc('IndustrySettings', companyId, dto);
  }

  // ── Inventory Settings ─────────────────────────────────
  async getInventorySettings(companyId: string) {
    return this.getSettingsDoc('InventorySettings', companyId);
  }
  async updateInventorySettings(companyId: string, dto: any) {
    return this.updateSettingsDoc('InventorySettings', companyId, dto);
  }

  // ── Product Settings ───────────────────────────────────
  async getProductSettings(companyId: string) {
    return this.getSettingsDoc('ProductSettings', companyId);
  }
  async updateProductSettings(companyId: string, dto: any) {
    return this.updateSettingsDoc('ProductSettings', companyId, dto);
  }

  // ── Tax Settings ───────────────────────────────────────
  async getTaxSettings(companyId: string) {
    return this.getSettingsDoc('TaxSettings', companyId);
  }
  async updateTaxSettings(companyId: string, dto: any) {
    return this.updateSettingsDoc('TaxSettings', companyId, dto);
  }

  // ── Warehouse Config ───────────────────────────────────
  async getWarehouseConfig(companyId: string) {
    return this.getSettingsDoc('WarehouseConfig', companyId);
  }
  async updateWarehouseConfig(companyId: string, dto: any) {
    return this.updateSettingsDoc('WarehouseConfig', companyId, dto);
  }

  // ── Approval Settings ──────────────────────────────────
  async getApprovalSettings(companyId: string) {
    return this.getSettingsDoc('ApprovalSettings', companyId);
  }
  async updateApprovalSettings(companyId: string, dto: any) {
    return this.updateSettingsDoc('ApprovalSettings', companyId, dto);
  }

  // ── Notification Config ────────────────────────────────
  async getNotificationConfig(companyId: string) {
    return this.getSettingsDoc('NotificationConfig', companyId);
  }
  async updateNotificationConfig(companyId: string, dto: any) {
    return this.updateSettingsDoc('NotificationConfig', companyId, dto);
  }

  // ── Branding Settings ──────────────────────────────────
  async getBrandingSettings(companyId: string) {
    return this.getSettingsDoc('BrandingSettings', companyId);
  }
  async updateBrandingSettings(companyId: string, dto: any) {
    return this.updateSettingsDoc('BrandingSettings', companyId, dto);
  }
}
