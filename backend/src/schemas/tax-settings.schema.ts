import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaxSettingsDocument = TaxSettings & Document;

@Schema({ timestamps: true, collection: 'tax_settings' })
export class TaxSettings {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, unique: true })
  companyId: Types.ObjectId;

  @Prop({ default: true })
  gstEnabled: boolean;

  @Prop({ default: 18 })
  defaultGSTPercent: number;

  @Prop({ default: false })
  taxInclusivePricing: boolean;

  @Prop({ default: 'INV' })
  invoicePrefix: string;

  @Prop({ default: 'PO' })
  purchaseOrderPrefix: string;

  @Prop({ default: 'SO' })
  salesOrderPrefix: string;

  @Prop({ default: '₹' })
  currencySymbol: string;

  @Prop({ default: 2 })
  decimalPlaces: number;

  @Prop({ default: 30 })
  paymentTerms: number;

  @Prop({ default: false })
  creditLimitEnabled: boolean;
}

export const TaxSettingsSchema = SchemaFactory.createForClass(TaxSettings);
