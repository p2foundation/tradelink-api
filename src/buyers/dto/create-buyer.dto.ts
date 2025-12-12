import { IsString, IsOptional, IsArray } from 'class-validator';

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
}

