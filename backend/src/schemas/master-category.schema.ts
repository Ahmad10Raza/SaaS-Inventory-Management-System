import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MasterCategoryDocument = MasterCategory & Document;

@Schema({ timestamps: true, collection: 'master_categories' })
export class MasterCategory {
  @Prop({ required: true, unique: true, index: true })
  categoryId: string; // e.g. 'electronics_mobiles'

  @Prop({ required: true, index: true })
  industryId: string; // ref to MasterIndustry.industryId

  @Prop({ required: true })
  categoryName: string;

  @Prop()
  description: string;

  @Prop()
  icon: string;

  @Prop({ default: null })
  parentCategoryId: string; // Enables infinite nesting via Adjacency List

  // Feature Flags
  @Prop({ default: false }) supportsVariants: boolean;
  @Prop({ default: false }) supportsBatchTracking: boolean;
  @Prop({ default: false }) supportsSerialTracking: boolean;
  @Prop({ default: false }) supportsExpiryTracking: boolean;
  @Prop({ default: false }) supportsManufacturing: boolean;

  @Prop({ default: 'active', enum: ['active', 'inactive', 'deprecated'] })
  status: string;
}

export const MasterCategorySchema = SchemaFactory.createForClass(MasterCategory);
