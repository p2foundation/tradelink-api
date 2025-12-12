import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class CreateFarmerDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsString()
  location: string;

  @IsString()
  district: string;

  @IsString()
  region: string;

  @IsOptional()
  @IsString()
  gpsAddress?: string;

  @IsOptional()
  @IsNumber()
  farmSize?: number;

  @IsOptional()
  @IsString()
  cooperativeId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  mobileMoneyNumber?: string;
}

