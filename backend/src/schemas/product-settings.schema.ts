import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductSettingsDocument = ProductSettings & Document;

@Schema({ timestamps: true, collection: 'product_settings' })
export class ProductSettings {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, unique: true })
  companyId: Types.ObjectId;

  @Prop({ default: false })
  dynamicAttributesEnabled: boolean;

  @Prop({ default: false })
  variantSupportEnabled: boolean;

  @Prop({ default: false })
  barcodeGenerationEnabled: boolean;

  @Prop({ default: true })
  skuAutoGenerationEnabled: boolean;

  @Prop({ default: false })
  qrCodeEnabled: boolean;

  @Prop({ default: false })
  unitConversionEnabled: boolean;

  @Prop({ default: false })
  comboProductEnabled: boolean;

  @Prop({ default: false })
  bundleProductEnabled: boolean;

  @Prop({ default: false })
  bomEnabled: boolean;
}

export const ProductSettingsSchema = SchemaFactory.createForClass(ProductSettings);
