import { IsString, IsEnum, IsOptional } from 'class-validator';
import { OfferStatus } from '@prisma/client';

export class RespondOfferDto {
  @IsEnum(OfferStatus)
  status: OfferStatus;

  @IsOptional()
  @IsString()
  responseMessage?: string;
}

