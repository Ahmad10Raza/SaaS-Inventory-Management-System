import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CategoryTemplateDocument = CategoryTemplate & Document;

@Schema({ timestamps: true, collection: 'category_templates' })
export class CategoryTemplate {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, index: true })
  categoryId: Types.ObjectId; // Links to the CompanyCategory

  @Prop({ required: true })
  templateName: string;

  @Prop()
  description: string;

  // e.g. ['sales_report', 'expiry_report']
  @Prop({ type: [String], default: [] })
  defaultReports: string[];

  // e.g. ['brand', 'size']
  @Prop({ type: [String], default: [] })
  defaultFilters: string[];

  // e.g. ['warranty', 'repair']
  @Prop({ type: [String], default: [] })
  enabledModules: string[];
}

export const CategoryTemplateSchema = SchemaFactory.createForClass(CategoryTemplate);
