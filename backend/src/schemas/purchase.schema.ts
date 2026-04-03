import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PurchaseDocument = Purchase & Document;

@Schema({ timestamps: true, collection: 'purchases' })
export class Purchase {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  purchaseNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true })
  vendorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse' })
  warehouseId: Types.ObjectId;

  @Prop({
    type: [
      {
        variantId: { type: Types.ObjectId, ref: 'ProductVariant' },
        productName: String,
        quantity: Number,
        receivedQuantity: { type: Number, default: 0 },
        unitPrice: Number,
        taxPercentage: Number,
        taxAmount: Number,
        totalPrice: Number,
      },
    ],
    default: [],
  })
  items: {
    variantId: Types.ObjectId;
    productName: string;
    quantity: number;
    receivedQuantity: number;
    unitPrice: number;
    taxPercentage: number;
    taxAmount: number;
    totalPrice: number;
  }[];

  @Prop({ default: 0 })
  subtotal: number;

  @Prop({ default: 0 })
  taxAmount: number;

  @Prop({ default: 0 })
  discount: number;

  @Prop({ default: 0 })
  transportCost: number;

  @Prop({ default: 0 })
  totalAmount: number;

  @Prop({
    enum: ['draft', 'pending', 'approved', 'ordered', 'partially_received', 'fully_received', 'received', 'cancelled'],
    default: 'draft',
  })
  status: string;

  @Prop({
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid',
  })
  paymentStatus: string;

  @Prop({ default: 0 })
  paidAmount: number;

  @Prop()
  expectedDeliveryDate: Date;

  @Prop()
  receivedDate: Date;

  @Prop()
  notes: string;

  @Prop()
  invoiceFile: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy: Types.ObjectId;
}

export const PurchaseSchema = SchemaFactory.createForClass(Purchase);
PurchaseSchema.index({ companyId: 1, createdAt: -1 });
