import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InventorySettingsDocument = InventorySettings & Document;

@Schema({ timestamps: true, collection: 'inventory_settings' })
export class InventorySettings {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, unique: true })
  companyId: Types.ObjectId;

  @Prop({ default: false })
  multiWarehouseEnabled: boolean;

  @Prop({ default: false })
  negativeStockAllowed: boolean;

  @Prop({ default: false })
  autoReorderEnabled: boolean;

  @Prop({ default: 10 })
  reorderThresholdDefault: number;

  @Prop({ default: false })
  stockReservationEnabled: boolean;

  @Prop({ default: false })
  batchTrackingEnabled: boolean;

  @Prop({ default: false })
  serialTrackingEnabled: boolean;

  @Prop({ default: false })
  expiryTrackingEnabled: boolean;

  @Prop({ default: false })
  damagedStockWorkflowEnabled: boolean;

  @Prop({ default: false })
  transferApprovalRequired: boolean;
}

export const InventorySettingsSchema = SchemaFactory.createForClass(InventorySettings);
