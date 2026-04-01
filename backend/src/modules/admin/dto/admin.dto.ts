import { IsOptional, IsString, IsBoolean, IsEnum, IsNumber } from 'class-validator';

export class UpdateCompanyStatusDto {
  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateCompanyPlanDto {
  @IsEnum(['free_trial', 'basic', 'standard', 'premium'])
  plan: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CompanyFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['free_trial', 'basic', 'standard', 'premium'])
  subscriptionPlan?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class CreateCompanyDto {
  @IsString()
  name: string;

  @IsString()
  industry: string;

  @IsString()
  ownerFirstName: string;

  @IsString()
  ownerLastName: string;

  @IsString()
  ownerEmail: string;

  @IsOptional()
  @IsEnum(['free_trial', 'basic', 'standard', 'premium'])
  subscriptionPlan?: string;
}
