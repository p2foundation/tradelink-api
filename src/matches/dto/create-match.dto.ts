import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { MatchStatus } from '@prisma/client';

export class CreateMatchDto {
  @IsString()
  listingId: string;

  @IsString()
  farmerId: string;

  @IsOptional()
  @IsString()
  buyerId?: string;

  @IsOptional()
  @IsNumber()
  compatibilityScore?: number;

  @IsOptional()
  @IsNumber()
  estimatedValue?: number;

  @IsOptional()
  @IsString()
  aiRecommendation?: string;

  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;
}

