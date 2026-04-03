import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

@Schema({ timestamps: true, collection: 'invoices' })
export class Invoice {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  invoiceNumber: string;

  @Prop({ required: true, enum: ['purchase', 'sale'] })
  type: string;

  @Prop({ type: Types.ObjectId })
  referenceId: Types.ObjectId; // Purchase or Sale ID

  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customerId: Types.ObjectId;

  @Prop({
    type: [
      {
        description: String,
        quantity: Number,
        unitPrice: Number,
        taxPercentage: Number,
        taxAmount: Number,
        totalPrice: Number,
      },
    ],
    default: [],
  })
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    taxPercentage: number;
    taxAmount: number;
    totalPrice: number;
  }[];

  @Prop({ default: 0 })
  subtotal: number;

  @Prop({ type: Object })
  taxDetails: {
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
  };

  @Prop({ default: 0 })
  totalAmount: number;

  @Prop({
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft',
  })
  status: string;

  @Prop()
  dueDate: Date;

  @Prop()
  paidDate: Date;

  @Prop()
  notes: string;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
