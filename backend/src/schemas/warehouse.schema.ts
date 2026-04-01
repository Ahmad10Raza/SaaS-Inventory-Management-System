import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WarehouseDocument = Warehouse & Document;

@Schema({ timestamps: true, collection: 'warehouses' })
export class Warehouse {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ type: Object, required: false })
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };

  @Prop()
  location: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  managerId: Types.ObjectId;

  @Prop()
  capacity: number;

  @Prop()
  phone: string;

  @Prop()
  email: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const WarehouseSchema = SchemaFactory.createForClass(Warehouse);
