import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export enum DocumentType {
  EXPORT_LICENSE = 'EXPORT_LICENSE',
  IMPORT_PERMIT = 'IMPORT_PERMIT',
  CERTIFICATE_OF_ORIGIN = 'CERTIFICATE_OF_ORIGIN',
  PHYTOSANITARY_CERTIFICATE = 'PHYTOSANITARY_CERTIFICATE',
  QUALITY_CERTIFICATE = 'QUALITY_CERTIFICATE',
  ORGANIC_CERTIFICATION = 'ORGANIC_CERTIFICATION',
  FAIR_TRADE_CERTIFICATION = 'FAIR_TRADE_CERTIFICATION',
  COMMERCIAL_INVOICE = 'COMMERCIAL_INVOICE',
  PACKING_LIST = 'PACKING_LIST',
  BILL_OF_LADING = 'BILL_OF_LADING',
  INSURANCE_CERTIFICATE = 'INSURANCE_CERTIFICATE',
  TRADE_CONTRACT = 'TRADE_CONTRACT',
  GEPA_LICENSE = 'GEPA_LICENSE',
  CUSTOMS_DECLARATION = 'CUSTOMS_DECLARATION',
  HEALTH_CERTIFICATE = 'HEALTH_CERTIFICATE',
  OTHER = 'OTHER',
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export class CreateDocumentDto {
  @IsString()
  name: string;

  @IsEnum(DocumentType)
  type: DocumentType;

  @IsString()
  fileUrl: string; // Base64 or URL to stored file

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string; // License number, certificate number, etc.

  @IsOptional()
  @IsString()
  issuedBy?: string; // Issuing authority (GEPA, GRA, etc.)

  @IsOptional()
  @IsString()
  transactionId?: string; // Link to transaction if applicable
}

