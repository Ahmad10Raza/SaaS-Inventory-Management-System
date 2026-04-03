import { IsNotEmpty, IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

class TransferItemDto {
  @IsNotEmpty() @IsString() variantId: string;
  @IsNotEmpty() @Type(() => Number) @IsNumber() quantity: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateTransferDto {
  @IsNotEmpty() @IsString() fromWarehouseId: string;
  @IsNotEmpty() @IsString() toWarehouseId: string;
  @IsNotEmpty() @IsArray() @ValidateNested({ each: true }) @Type(() => TransferItemDto) items: TransferItemDto[];
  @IsOptional() @IsString() notes?: string;
}

export class UpdateTransferStatusDto {
  @IsNotEmpty() @IsEnum(['approved', 'in_transit', 'received', 'cancelled'])
  status: string;
  @IsOptional() @IsString() notes?: string;
}
