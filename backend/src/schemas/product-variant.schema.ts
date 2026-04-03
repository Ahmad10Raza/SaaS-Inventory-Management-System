import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductVariantDocument = ProductVariant & Document;

@Schema({ timestamps: true, collection: 'product_variants' })
export class ProductVariant {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  name: string; // e.g. "iPhone 15 Pro - Black - 256GB"

  @Prop({ required: true })
  sku: string;

  @Prop()
  barcode: string;

  @Prop({ default: 'piece' })
  unit: string;

  @Prop({ type: Object, default: {} })
  attributes: Record<string, any>; // color: black, size: 256GB

  @Prop({ type: Number, required: true, min: 0 })
  price: number; // Selling price for this specific variant

  @Prop({ type: Number, min: 0, default: 0 })
  costPrice: number; // Cost price for this specific variant

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDefault: boolean; // Is this the primary/default variant for the product?
}

export const ProductVariantSchema = SchemaFactory.createForClass(ProductVariant);
ProductVariantSchema.index({ companyId: 1, sku: 1 }, { unique: true, partialFilterExpression: { sku: { $type: "string", $ne: "" }, isActive: true } });
ProductVariantSchema.index({ companyId: 1, barcode: 1 }, { unique: true, partialFilterExpression: { barcode: { $type: "string", $ne: "" }, isActive: true } });
ProductVariantSchema.index({ productId: 1, isDefault: 1 });
