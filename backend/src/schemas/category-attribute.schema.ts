import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CategoryAttributeDocument = CategoryAttribute & Document;

@Schema({ timestamps: true, collection: 'category_attributes' })
export class CategoryAttribute {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, index: true })
  categoryId: Types.ObjectId; // Links to the CompanyCategory

  @Prop({ required: true })
  attributeName: string; // e.g. "Screen Size", "RAM", "Thickness"

  @Prop({ required: true, enum: ['text', 'number', 'boolean', 'dropdown', 'date'] })
  attributeType: string;

  @Prop({ default: false })
  required: boolean;

  @Prop()
  defaultValue: string;

  // Used if attributeType === 'dropdown'
  @Prop({ type: [String], default: [] })
  dropdownOptions: string[];

  @Prop({ default: 0 })
  displayOrder: number;
}

export const CategoryAttributeSchema = SchemaFactory.createForClass(CategoryAttribute);
