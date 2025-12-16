import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export enum RelationshipStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
}

export enum RelationshipType {
  DIRECT = 'DIRECT',
  COOPERATIVE = 'COOPERATIVE',
  CONTRACT = 'CONTRACT',
  PARTNERSHIP = 'PARTNERSHIP',
}

export class CreateSupplierNetworkDto {
  @IsString()
  farmerId: string;

  @IsOptional()
  @IsEnum(RelationshipType)
  relationshipType?: RelationshipType;

  @IsOptional()
  @IsDateString()
  contractStartDate?: string;

  @IsOptional()
  @IsDateString()
  contractEndDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

