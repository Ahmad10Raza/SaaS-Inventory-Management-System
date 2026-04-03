import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SaleDocument = Sale & Document;

@Schema({ timestamps: true, collection: 'sales' })
export class Sale {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  saleNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse' })
  warehouseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Invoice' })
  invoiceId: Types.ObjectId;

  @Prop({
    type: [
      {
        variantId: { type: Types.ObjectId, ref: 'ProductVariant' },
        productName: String,
        quantity: Number,
        unitPrice: Number,
        taxPercentage: Number,
        taxAmount: Number,
        discount: Number,
        totalPrice: Number,
      },
    ],
    default: [],
  })
  items: {
    variantId: Types.ObjectId;
    productName: string;
    quantity: number;
    unitPrice: number;
    taxPercentage: number;
    taxAmount: number;
    discount: number;
    totalPrice: number;
  }[];

  @Prop({ default: 0 })
  subtotal: number;

  @Prop({ default: 0 })
  taxAmount: number;

  @Prop({ default: 0 })
  discount: number;

  @Prop({ default: 0 })
  totalAmount: number;

  @Prop({
    enum: ['draft', 'confirmed', 'reserved', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'draft',
  })
  status: string;

  @Prop({
    enum: ['unpaid', 'partial', 'paid', 'refunded'],
    default: 'unpaid',
  })
  paymentStatus: string;

  @Prop({ default: 0 })
  paidAmount: number;

  @Prop()
  deliveryDate: Date;

  @Prop()
  shippedDate: Date;

  @Prop()
  notes: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);
SaleSchema.index({ companyId: 1, createdAt: -1 });
