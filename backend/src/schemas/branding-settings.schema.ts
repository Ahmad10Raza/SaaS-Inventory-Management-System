import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BrandingSettingsDocument = BrandingSettings & Document;

@Schema({ timestamps: true, collection: 'branding_settings' })
export class BrandingSettings {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, unique: true })
  companyId: Types.ObjectId;

  @Prop({ default: '#6366f1' })
  sidebarColor: string;

  @Prop({ default: '#6366f1' })
  themeColor: string;

  @Prop({ default: false })
  darkModeDefault: boolean;

  @Prop()
  invoiceLogo: string;

  @Prop()
  companyLogo: string;

  @Prop()
  customDomain: string;

  @Prop({ default: false })
  whiteLabelEnabled: boolean;
}

export const BrandingSettingsSchema = SchemaFactory.createForClass(BrandingSettings);
