import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

export enum FinanceType {
  LOAN = 'loan',
  INSURANCE = 'insurance',
  PAYMENT = 'payment',
}

export class CreateFinanceApplicationDto {
  @IsEnum(FinanceType)
  type: FinanceType;

  @IsString()
  optionId: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;
}

