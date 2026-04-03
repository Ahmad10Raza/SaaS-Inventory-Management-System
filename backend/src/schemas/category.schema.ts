import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true, collection: 'categories' })
export class Category {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', default: null })
  parentCategoryId: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  // ── New Architecture Fields ─────────────────────────
  @Prop({ default: null })
  masterCategoryId: string; // If null, it's a custom category

  @Prop({ default: false })
  isCustomCategory: boolean;

  @Prop({ default: 0 })
  displayOrder: number;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
