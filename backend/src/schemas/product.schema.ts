import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  brand: string;

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  categoryId: Types.ObjectId;

  @Prop({ default: 0 })
  taxPercentage: number;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: Object, default: {} })
  dynamicAttributes: Record<string, any>;

  @Prop({ type: Number, min: 0, default: 0 })
  minSellingPrice: number; // Global floor for this product across all variants

  @Prop({ default: true })
  isActive: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ companyId: 1, name: 'text', brand: 'text' });
