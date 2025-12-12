import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsDateString,
} from 'class-validator';
import { QualityGrade, ListingStatus } from '@prisma/client';

export class CreateListingDto {
  @IsString()
  cropType: string;

  @IsOptional()
  @IsString()
  cropVariety?: string;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsEnum(QualityGrade)
  qualityGrade: QualityGrade;

  @IsNumber()
  pricePerUnit: number;

  @IsOptional()
  @IsDateString()
  harvestDate?: string;

  @IsDateString()
  availableFrom: string;

  @IsOptional()
  @IsDateString()
  availableUntil?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;
}

