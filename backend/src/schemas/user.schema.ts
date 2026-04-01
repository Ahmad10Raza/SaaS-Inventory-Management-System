import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  phone: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({
    enum: [
      'super_admin',
      'company_owner',
      'inventory_manager',
      'sales_manager',
      'purchase_manager',
      'warehouse_manager',
      'accountant',
      'staff',
      'read_only',
    ],
    default: 'staff',
  })
  role: string;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop()
  avatar: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isTemporaryPassword: boolean;

  @Prop()
  lastLogin: Date;

  @Prop({ default: false })
  hasSeenTour: boolean;

  @Prop()
  refreshToken: string;

  @Prop()
  passwordResetToken: string;

  @Prop()
  passwordResetExpires: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Unique email within each tenant database
UserSchema.index({ email: 1 }, { unique: true });
