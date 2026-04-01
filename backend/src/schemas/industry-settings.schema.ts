import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type IndustrySettingsDocument = IndustrySettings & Document;

@Schema({ timestamps: true, collection: 'industry_settings' })
export class IndustrySettings {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, unique: true })
  companyId: Types.ObjectId;

  @Prop({ required: true })
  industryType: string;

  /** Feature modules enabled for this tenant e.g. ['warranty', 'bom', 'repair'] */
  @Prop({ type: [String], default: [] })
  enabledModules: string[];

  /** Tracking types active e.g. ['serial', 'batch', 'expiry', 'imei'] */
  @Prop({ type: [String], default: [] })
  enabledTrackingTypes: string[];

  /** Approval flows active e.g. ['purchase_approval', 'discount_approval'] */
  @Prop({ type: [String], default: [] })
  enabledApprovalFlows: string[];

  /** Notification types active e.g. ['low_stock', 'expiry_alert'] */
  @Prop({ type: [String], default: [] })
  enabledNotificationTypes: string[];

  /** Reports available e.g. ['stock_summary', 'expiry_report', 'production_report'] */
  @Prop({ type: [String], default: [] })
  enabledReports: string[];
}

export const IndustrySettingsSchema = SchemaFactory.createForClass(IndustrySettings);
