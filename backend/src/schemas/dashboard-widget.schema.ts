import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DashboardWidgetDocument = DashboardWidget & Document;

@Schema({ timestamps: true, collection: 'dashboard_widgets' })
export class DashboardWidget {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ required: true })
  widgetKey: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  icon: string;

  @Prop({ default: 0 })
  order: number;

  @Prop({ default: true })
  isVisible: boolean;
}

export const DashboardWidgetSchema = SchemaFactory.createForClass(DashboardWidget);
