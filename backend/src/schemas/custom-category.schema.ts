import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomCategoryDocument = CustomCategory & Document;

@Schema({ timestamps: true, collection: 'custom_categories' })
export class CustomCategory {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ required: true })
  categoryName: string;

  @Prop()
  description: string;

  @Prop()
  basedOnIndustry: string;

  @Prop({ type: Object, default: {} })
  customAttributes: Record<string, any>;

  @Prop({ default: true })
  isActive: boolean;
}

export const CustomCategorySchema = SchemaFactory.createForClass(CustomCategory);
