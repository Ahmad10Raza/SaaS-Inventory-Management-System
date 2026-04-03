import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WarehouseStockDocument = WarehouseStock & Document;

@Schema({ timestamps: true, collection: 'warehouse_stock' })
export class WarehouseStock {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ProductVariant', required: true, index: true })
  variantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse', required: true, index: true })
  warehouseId: Types.ObjectId;

  @Prop({ required: true, default: 0 })
  totalQuantity: number;

  @Prop({ default: 0 })
  reservedQuantity: number; // Locked by confirmed sales orders

  @Prop({ default: 0 })
  damagedQuantity: number; // Non-sellable stock

  @Prop({ default: 0 })
  inTransitQuantity: number; // Stock currently moving to/from another warehouse

  // Computed: total - reserved - damaged - inTransit
  @Prop({ default: 0 })
  availableQuantity: number;

  @Prop({ default: 10 })
  reorderLevel: number;

  @Prop({ default: 5 })
  minStockLevel: number;

  @Prop()
  location: string; // Rack/Bin details
}

export const WarehouseStockSchema = SchemaFactory.createForClass(WarehouseStock);
WarehouseStockSchema.index({ companyId: 1, variantId: 1, warehouseId: 1 }, { unique: true });

// Middleware to auto-calculate available quantity before saving
WarehouseStockSchema.pre('save', function() {
  this.availableQuantity = this.totalQuantity - (this.reservedQuantity || 0) - (this.damagedQuantity || 0) - (this.inTransitQuantity || 0);
});
