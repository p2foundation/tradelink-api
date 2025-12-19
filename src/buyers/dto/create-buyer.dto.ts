import { IsString, IsOptional, IsArray, IsBoolean, IsObject } from 'class-validator';

export class CreateBuyerDto {
  @IsString()
  userId: string;

  @IsString()
  companyName: string;

  @IsString()
  country: string;

  @IsString()
  industry: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  companySize?: string;

  @IsArray()
  @IsString({ each: true })
  seekingCrops: string[];

  @IsOptional()
  @IsString()
  volumeRequired?: string;

  @IsArray()
  @IsString({ each: true })
  qualityStandards: string[];

  // New fields for international buyers
  @IsOptional()
  @IsString()
  importLicenseNumber?: string;

  @IsOptional()
  @IsString()
  businessRegistration?: string;

  @IsOptional()
  @IsString()
  taxIdNumber?: string;

  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetMarkets?: string[];

  @IsOptional()
  @IsObject()
  importRequirements?: any; // JSON object for country-specific requirements
}

