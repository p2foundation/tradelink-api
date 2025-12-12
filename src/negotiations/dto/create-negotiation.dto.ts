import { IsString, IsNumber, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { NegotiationStatus } from '@prisma/client';

export class CreateNegotiationDto {
  @IsString()
  matchId: string;

  @IsNumber()
  initialPrice: number;

  @IsNumber()
  currentPrice: number;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsString()
  deliveryTerms?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  initiatedBy?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

