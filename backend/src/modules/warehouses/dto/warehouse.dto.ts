import { IsNotEmpty, IsString, IsOptional, IsNumber, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWarehouseDto {
  @IsNotEmpty() @IsString() name: string;
  @IsOptional() @IsObject() address?: { street: string; city: string; state: string; country: string; zipCode: string };
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() managerId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() capacity?: number;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
}

export class UpdateWarehouseDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsObject() address?: { street: string; city: string; state: string; country: string; zipCode: string };
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() managerId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() capacity?: number;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() isActive?: boolean;
}
