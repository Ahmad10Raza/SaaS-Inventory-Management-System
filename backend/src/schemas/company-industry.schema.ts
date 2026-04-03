import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CompanyIndustryDocument = CompanyIndustry & Document;

@Schema({ timestamps: true, collection: 'company_industries' })
export class CompanyIndustry {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ required: true, index: true })
  industryId: string; // Refers to MasterIndustry.industryId

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  removedAt: Date;
}

export const CompanyIndustrySchema = SchemaFactory.createForClass(CompanyIndustry);
