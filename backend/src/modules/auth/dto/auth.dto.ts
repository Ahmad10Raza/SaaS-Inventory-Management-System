import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsNumber, IsBoolean, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class FeaturePreferencesDto {
  @IsOptional() @IsBoolean() batchTracking?: boolean;
  @IsOptional() @IsBoolean() serialTracking?: boolean;
  @IsOptional() @IsBoolean() expiryTracking?: boolean;
  @IsOptional() @IsBoolean() manufacturingModule?: boolean;
  @IsOptional() @IsBoolean() warehouseTransfers?: boolean;
  @IsOptional() @IsBoolean() approvalWorkflow?: boolean;
}

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  companyName: string;

  @IsNotEmpty()
  @IsString()
  industry: string;

  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // ── New onboarding fields ──────────────────────────────
  @IsOptional() @IsString() businessType?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsNumber() warehouseCount?: number;
  @IsOptional() @IsNumber() employeeCount?: number;
  @IsOptional() @IsNumber() expectedProductCount?: number;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => FeaturePreferencesDto)
  featurePreferences?: FeaturePreferencesDto;
}

export class LoginDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}

export class SetupPasswordDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  newPassword: string;
}
