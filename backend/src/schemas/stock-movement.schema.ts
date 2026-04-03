import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StockMovementDocument = StockMovement & Document;

@Schema({ timestamps: true, collection: 'stock_movements' })
export class StockMovement {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ProductVariant', required: true, index: true })
  variantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse', required: true, index: true })
  warehouseId: Types.ObjectId;

  @Prop({ required: true, enum: ['total', 'reserved', 'damaged', 'in_transit'] })
  bucket: string; // Which quantity bucket was changed

  @Prop({ required: true, enum: ['stock_in', 'stock_out', 'reserved_lock', 'reserved_release', 'damage_mark', 'damage_unmark', 'transfer_start', 'transfer_complete'] })
  type: string;

  @Prop({ required: true })
  quantity: number; // The amount of change

  @Prop({ required: true })
  previousQuantity: number;

  @Prop({ required: true })
  newQuantity: number;

  @Prop({ required: true })
  reference: string; // PO Number, Sales Number, Transfer ID

  @Prop({ required: true, enum: ['purchase', 'sale', 'transfer', 'adjustment', 'return'] })
  referenceType: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  performedBy: Types.ObjectId;

  @Prop()
  notes: string;
}

export const StockMovementSchema = SchemaFactory.createForClass(StockMovement);
StockMovementSchema.index({ companyId: 1, createdAt: -1 });
StockMovementSchema.index({ reference: 1 });
StockMovementSchema.index({ companyId: 1, variantId: 1, warehouseId: 1 });
