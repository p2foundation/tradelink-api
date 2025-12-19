import { PartialType } from '@nestjs/mapped-types';
import { CreateBuyerDto } from './create-buyer.dto';
import { IsString, IsOptional, IsArray, IsBoolean, IsObject } from 'class-validator';

export class UpdateBuyerDto extends PartialType(CreateBuyerDto) {
  @IsOptional()
  @IsString()
  complianceStatus?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  complianceDocuments?: string[];

  @IsOptional()
  @IsBoolean()
  verifiedByGhanaSW?: boolean;

  @IsOptional()
  @IsString()
  ghanaSWReference?: string;
}
