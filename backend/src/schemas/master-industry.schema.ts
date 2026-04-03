import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MasterIndustryDocument = MasterIndustry & Document;

@Schema({ timestamps: true, collection: 'master_industries' })
export class MasterIndustry {
  @Prop({ required: true, unique: true, index: true })
  industryId: string; // e.g. 'electronics', 'pharmacy', 'iron_factory'

  @Prop({ required: true })
  industryName: string;

  @Prop()
  description: string;

  @Prop()
  icon: string;

  @Prop({ default: 'active', enum: ['active', 'inactive', 'deprecated'] })
  status: string;
}

export const MasterIndustrySchema = SchemaFactory.createForClass(MasterIndustry);
