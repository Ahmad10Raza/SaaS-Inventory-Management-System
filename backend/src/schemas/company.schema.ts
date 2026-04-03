import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CompanyDocument = Company & Document;

@Schema({ timestamps: true, collection: 'companies' })
export class Company {
  // ── Multi-tenant routing fields ──────────────────────
  @Prop({ unique: true, sparse: true })
  companyId: string;

  @Prop({ unique: true, sparse: true })
  tenantId: string;

  @Prop({ unique: true, sparse: true })
  databaseName: string;

  // ── Company identity ─────────────────────────────────
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  slug: string;

  @Prop()
  logo: string;

  @Prop()
  email: string;

  @Prop()
  phone: string;

  @Prop()
  website: string;

  @Prop({ unique: true, sparse: true, lowercase: true })
  ownerEmail: string;

  // ── Address ──────────────────────────────────────────
  @Prop({ type: Object, default: {} })
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };

  // ── Tax / Legal ──────────────────────────────────────
  @Prop()
  gstNumber: string;

  @Prop()
  panNumber: string;

  // ── Industry & Business Type ─────────────────────────
  @Prop({
    enum: [
      'electronics',
      'clothing',
      'pharmacy',
      'grocery_store',
      'iron_factory',
      'plastic_factory',
      'warehouse',
      'retail_store',
      'distributor',
      'wholesale',
      'fmcg',
      'manufacturing',
      'platform_management',
      'other',
    ],
    default: 'other',
  })
  industry: string;

  @Prop({
    enum: ['b2b', 'b2c', 'b2b2c', 'd2c', 'marketplace', 'other'],
    default: 'other',
  })
  businessType: string;

  // ── Operational metadata ─────────────────────────────
  @Prop({ default: 'INR' })
  currency: string;

  @Prop({ default: 'Asia/Kolkata' })
  timezone: string;

  @Prop({ default: 'en' })
  language: string;

  @Prop({ default: 'April' })
  financialYearStart: string;

  @Prop({ default: 1 })
  employeeCount: number;

  @Prop({ default: 1 })
  warehouseCount: number;

  @Prop({ default: 100 })
  expectedProductCount: number;

  // ── Legacy settings object (deprecated – use per-tenant settings) ─
  @Prop({ type: Object, default: {} })
  settings: Record<string, any>;

  // ── Subscription ─────────────────────────────────────
  @Prop({
    enum: ['free_trial', 'basic', 'standard', 'premium'],
    default: 'free_trial',
  })
  subscriptionPlan: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  trialEndsAt: Date;
}

export const CompanySchema = SchemaFactory.createForClass(Company);
