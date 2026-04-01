import { IsNotEmpty, IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

class PurchaseItemDto {
  @IsNotEmpty() @IsString() productId: string;
  @IsOptional() @IsString() productName?: string;
  @IsNotEmpty() @Type(() => Number) @IsNumber() quantity: number;
  @IsNotEmpty() @Type(() => Number) @IsNumber() unitPrice: number;
  @IsOptional() @Type(() => Number) @IsNumber() taxPercentage?: number;
  @IsOptional() @Type(() => Number) @IsNumber() taxAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() totalPrice?: number;
  @IsOptional() @IsString() unit?: string;
}

export class CreatePurchaseDto {
  @IsNotEmpty() @IsString() vendorId: string;
  @IsOptional() @IsString() warehouseId?: string;
  @IsNotEmpty() @IsArray() @ValidateNested({ each: true }) @Type(() => PurchaseItemDto) items: PurchaseItemDto[];
  @IsOptional() @Type(() => Number) @IsNumber() subtotal?: number;
  @IsOptional() @Type(() => Number) @IsNumber() taxAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() discount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() totalAmount?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() expectedDeliveryDate?: string;
}

export class UpdatePurchaseStatusDto {
  @IsNotEmpty() @IsEnum(['approved', 'rejected', 'received', 'cancelled'])
  status: string;
  @IsOptional() @IsString() notes?: string;
}

export class PurchasePaymentDto {
  @IsNotEmpty() @Type(() => Number) @IsNumber() amount: number;
  @IsNotEmpty() @IsString() paymentMethod: string;
  @IsOptional() @IsString() transactionId?: string;
  @IsOptional() @IsString() notes?: string;
}
