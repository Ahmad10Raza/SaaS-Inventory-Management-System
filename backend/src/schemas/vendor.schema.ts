import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VendorDocument = Vendor & Document;

@Schema({ timestamps: true, collection: 'vendors' })
export class Vendor {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  email: string;

  @Prop()
  phone: string;

  @Prop({ type: Object })
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };

  @Prop()
  gstNumber: string;

  @Prop({ default: 0, min: 0, max: 5 })
  rating: number;

  @Prop({ default: 0 })
  totalOrders: number;

  @Prop({ default: 0 })
  totalAmount: number;

  @Prop()
  contactPerson: string;

  @Prop()
  notes: string;

  @Prop({ default: 0 })
  outstandingAmount: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);
