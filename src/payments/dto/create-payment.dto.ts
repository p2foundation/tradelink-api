import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @IsString()
  transactionId: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  provider?: string;

  // For manual payments
  @IsOptional()
  @IsBoolean()
  isManual?: boolean;

  @IsOptional()
  @IsString()
  receiptNumber?: string;

  @IsOptional()
  @IsDateString()
  receiptDate?: string;
}

