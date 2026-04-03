import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PriceHistoryDocument = PriceHistory & Document;

@Schema({ timestamps: true, collection: 'price_history' })
export class PriceHistory {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ProductVariant', required: true, index: true })
  variantId: Types.ObjectId;

  @Prop({ required: true, enum: ['purchase', 'selling', 'cost'] })
  priceType: string;

  @Prop({ required: true })
  oldPrice: number;

  @Prop({ required: true })
  newPrice: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  changedBy: Types.ObjectId;

  @Prop()
  reason: string;

  @Prop()
  source: string; // e.g. "manual_update", "purchase_order_received"
}

export const PriceHistorySchema = SchemaFactory.createForClass(PriceHistory);
PriceHistorySchema.index({ companyId: 1, variantId: 1, createdAt: -1 });
PriceHistorySchema.index({ priceType: 1 });
