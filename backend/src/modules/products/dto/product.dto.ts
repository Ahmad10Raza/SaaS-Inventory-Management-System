import { IsNotEmpty, IsString, IsNumber, IsOptional, IsArray, Min, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsNotEmpty() @IsString() name: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() taxPercentage?: number;
  @IsOptional() @IsArray() images?: string[];
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minSellingPrice?: number;
  @IsOptional() dynamicAttributes?: Record<string, any>;

  // Initial Variant Details
  @IsNotEmpty() @IsString() sku: string;
  @IsOptional() @IsString() barcode?: string;
  @IsNotEmpty() @Type(() => Number) @IsNumber() @Min(0) price: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) costPrice?: number;
  @IsOptional() @IsString() unit?: string;
}

export class UpdateProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() taxPercentage?: number;
  @IsOptional() @IsArray() images?: string[];
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minSellingPrice?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() dynamicAttributes?: Record<string, any>;

  // Variant update support
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() barcode?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) price?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) costPrice?: number;
  @IsOptional() @IsString() unit?: string;
}

export class CreateVariantDto {
  @IsNotEmpty() @IsString() name: string;
  @IsNotEmpty() @IsString() sku: string;
  @IsOptional() @IsString() barcode?: string;
  @IsNotEmpty() @Type(() => Number) @IsNumber() @Min(0) price: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) costPrice?: number;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() attributes?: Record<string, any>;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
