import { IsNotEmpty, IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

class PurchaseItemDto {
  @IsNotEmpty() @IsString() variantId: string;
  @IsOptional() @IsString() productName?: string;
  @IsNotEmpty() @Type(() => Number) @IsNumber() quantity: number;
  @IsOptional() @Type(() => Number) @IsNumber() receivedQuantity?: number;
  @IsNotEmpty() @Type(() => Number) @IsNumber() unitPrice: number;
  @IsOptional() @Type(() => Number) @IsNumber() taxPercentage?: number;
  @IsOptional() @Type(() => Number) @IsNumber() taxAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() discount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() totalPrice?: number;
}

export class CreatePurchaseDto {
  @IsNotEmpty() @IsString() vendorId: string;
  @IsOptional() @IsString() warehouseId?: string;
  @IsNotEmpty() @IsArray() @ValidateNested({ each: true }) @Type(() => PurchaseItemDto) items: PurchaseItemDto[];
  @IsOptional() @Type(() => Number) @IsNumber() subtotal?: number;
  @IsOptional() @Type(() => Number) @IsNumber() taxAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() discount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() transportCost?: number;
  @IsOptional() @IsNumber() @Type(() => Number) paidAmount?: number;
  @IsOptional() @IsString() paymentMethod?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() expectedDeliveryDate?: string;
}

export class UpdatePurchaseStatusDto {
  @IsNotEmpty() @IsEnum(['approved', 'ordered', 'partially_received', 'fully_received', 'received', 'cancelled'])
  status: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() items?: { variantId: string, receivedQuantity: number }[]; // For granular receiving
}

export class PurchasePaymentDto {
  @IsNotEmpty() @Type(() => Number) @IsNumber() amount: number;
  @IsNotEmpty() @IsString() paymentMethod: string;
  @IsOptional() @IsString() transactionId?: string;
  @IsOptional() @IsString() notes?: string;
}
