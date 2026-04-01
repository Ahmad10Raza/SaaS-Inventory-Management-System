import { IsNotEmpty, IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SaleItemDto {
  @IsNotEmpty() @IsString() productId: string;
  @IsOptional() @IsString() productName?: string;
  @IsNotEmpty() @Type(() => Number) @IsNumber() quantity: number;
  @IsNotEmpty() @Type(() => Number) @IsNumber() unitPrice: number;
  @IsOptional() @Type(() => Number) @IsNumber() discount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() taxPercentage?: number;
  @IsOptional() @Type(() => Number) @IsNumber() taxAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() totalPrice?: number;
  @IsOptional() @IsString() unit?: string;
}

export class CreateSaleDto {
  @IsNotEmpty() @IsString() customerId: string;
  @IsOptional() @IsString() warehouseId?: string;
  @IsNotEmpty() @IsArray() @ValidateNested({ each: true }) @Type(() => SaleItemDto) items: SaleItemDto[];
  @IsOptional() @Type(() => Number) @IsNumber() subtotal?: number;
  @IsOptional() @Type(() => Number) @IsNumber() taxAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() discount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() totalAmount?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() paymentMethod?: string;
}

export class SalePaymentDto {
  @IsNotEmpty() @Type(() => Number) @IsNumber() amount: number;
  @IsNotEmpty() @IsString() paymentMethod: string;
  @IsOptional() @IsString() transactionId?: string;
}
