import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateOfferDto {
  @IsString()
  negotiationId: string;

  @IsString()
  offeredBy: string;

  @IsEnum(UserRole)
  offeredByRole: UserRole;

  @IsNumber()
  price: number;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  terms?: string;
}

