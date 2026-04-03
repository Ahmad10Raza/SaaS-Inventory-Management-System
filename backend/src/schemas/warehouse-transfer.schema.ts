import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WarehouseTransferDocument = WarehouseTransfer & Document;

@Schema({ timestamps: true, collection: 'warehouse_transfers' })
export class WarehouseTransfer {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  transferNumber: string; // e.g. TR-2026-001

  @Prop({ type: Types.ObjectId, ref: 'Warehouse', required: true })
  fromWarehouseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse', required: true })
  toWarehouseId: Types.ObjectId;

  @Prop({
    type: [
      {
        variantId: { type: Types.ObjectId, ref: 'ProductVariant' },
        quantity: Number,
        notes: String,
      },
    ],
    default: [],
  })
  items: {
    variantId: Types.ObjectId;
    quantity: number;
    notes?: string;
  }[];

  @Prop({
    enum: ['pending', 'approved', 'in_transit', 'received', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Prop()
  shippedDate: Date;

  @Prop()
  receivedDate: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  receivedBy: Types.ObjectId;

  @Prop()
  notes: string;
}

export const WarehouseTransferSchema = SchemaFactory.createForClass(WarehouseTransfer);
WarehouseTransferSchema.index({ companyId: 1, transferNumber: 1 }, { unique: true });
WarehouseTransferSchema.index({ fromWarehouseId: 1 });
WarehouseTransferSchema.index({ toWarehouseId: 1 });
WarehouseTransferSchema.index({ status: 1 });
