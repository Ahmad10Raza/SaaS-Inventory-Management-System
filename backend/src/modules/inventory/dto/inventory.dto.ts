import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class StockInDto {
  @IsNotEmpty() @IsString() productId: string;
  @IsOptional() @IsString() variantId?: string;
  @IsNotEmpty() @IsString() warehouseId: string;
  @IsNotEmpty() @Type(() => Number) @IsNumber() quantity: number;
  @IsOptional() @IsString() batchNumber?: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() notes?: string;
}

export class StockOutDto {
  @IsNotEmpty() @IsString() productId: string;
  @IsOptional() @IsString() variantId?: string;
  @IsNotEmpty() @IsString() warehouseId: string;
  @IsNotEmpty() @Type(() => Number) @IsNumber() quantity: number;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() notes?: string;
}

export class StockAdjustDto {
  @IsNotEmpty() @IsString() productId: string;
  @IsOptional() @IsString() variantId?: string;
  @IsNotEmpty() @IsString() warehouseId: string;
  @IsNotEmpty() @Type(() => Number) @IsNumber() newQuantity: number;
  @IsOptional() @IsString() reason?: string;
}

export class StockTransferDto {
  @IsNotEmpty() @IsString() productId: string;
  @IsOptional() @IsString() variantId?: string;
  @IsNotEmpty() @IsString() fromWarehouseId: string;
  @IsNotEmpty() @IsString() toWarehouseId: string;
  @IsNotEmpty() @Type(() => Number) @IsNumber() quantity: number;
  @IsOptional() @IsString() notes?: string;
}
