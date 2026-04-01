import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WarehouseConfigDocument = WarehouseConfig & Document;

/** Tenant-level warehouse behaviour config (NOT the warehouse entity) */
@Schema({ timestamps: true, collection: 'warehouse_config' })
export class WarehouseConfig {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, unique: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse' })
  defaultWarehouseId: Types.ObjectId;

  @Prop({ default: false })
  multiWarehouseEnabled: boolean;

  @Prop({ default: false })
  warehouseTransferEnabled: boolean;

  @Prop({ default: false })
  rackManagementEnabled: boolean;

  @Prop({ default: false })
  binLocationEnabled: boolean;

  @Prop({ default: false })
  warehouseApprovalRequired: boolean;
}

export const WarehouseConfigSchema = SchemaFactory.createForClass(WarehouseConfig);
