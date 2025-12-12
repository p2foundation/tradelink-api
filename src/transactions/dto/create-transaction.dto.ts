import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  matchId: string;

  @IsString()
  buyerId: string;

  @IsOptional()
  @IsString()
  exportCompanyId?: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  agreedPrice: number;

  @IsNumber()
  totalValue: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  contractDocument?: string;

  @IsOptional()
  @IsString()
  invoiceDocument?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @IsOptional()
  @IsString()
  shipmentStatus?: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsDateString()
  shipmentDate?: string;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @IsOptional()
  @IsString()
  gcmsReferenceNo?: string;
}

