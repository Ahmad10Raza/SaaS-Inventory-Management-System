import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type SettingsDocument = Settings & Document;

@Schema({ timestamps: true, collection: 'settings' })
export class Settings {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ required: true })
  key: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  value: any;

  @Prop()
  category: string;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
