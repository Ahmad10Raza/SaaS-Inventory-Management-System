import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationConfigDocument = NotificationConfig & Document;

/** Tenant-level notification preferences (NOT individual notification records) */
@Schema({ timestamps: true, collection: 'notification_config' })
export class NotificationConfig {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, unique: true })
  companyId: Types.ObjectId;

  @Prop({ default: true })
  emailNotificationsEnabled: boolean;

  @Prop({ default: false })
  smsNotificationsEnabled: boolean;

  @Prop({ default: false })
  whatsappNotificationsEnabled: boolean;

  @Prop({ default: true })
  lowStockAlertsEnabled: boolean;

  @Prop({ default: false })
  expiryAlertsEnabled: boolean;

  @Prop({ default: true })
  paymentRemindersEnabled: boolean;

  @Prop({ default: false })
  dailySummaryEnabled: boolean;
}

export const NotificationConfigSchema = SchemaFactory.createForClass(NotificationConfig);
