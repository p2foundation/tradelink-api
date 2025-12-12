import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UploadReceiptDto {
  @IsString()
  receiptDocument: string; // File URL/path

  @IsString()
  receiptNumber: string;

  @IsDateString()
  receiptDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

