import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ApprovalSettingsDocument = ApprovalSettings & Document;

@Schema({ timestamps: true, collection: 'approval_settings' })
export class ApprovalSettings {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, unique: true })
  companyId: Types.ObjectId;

  @Prop({ default: true })
  roleBasedAccessEnabled: boolean;

  @Prop({ default: false })
  purchaseApprovalRequired: boolean;

  @Prop({ default: false })
  salesDiscountApprovalRequired: boolean;

  @Prop({ default: false })
  inventoryAdjustmentApprovalRequired: boolean;

  @Prop({ default: false })
  stockTransferApprovalRequired: boolean;
}

export const ApprovalSettingsSchema = SchemaFactory.createForClass(ApprovalSettings);
