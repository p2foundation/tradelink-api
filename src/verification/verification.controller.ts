import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { VerificationService } from './verification.service';

@ApiTags('Verification')
@Controller('verification')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('submit-to-ghana-sw')
  @ApiOperation({
    summary: 'Submit user for Ghana Single Window verification',
    description:
      'Submits a user (farmer, trader, or export company) for verification through Ghana Single Window system. Required for export approval.',
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully submitted to Ghana Single Window',
  })
  async submitToGhanaSW(@CurrentUser() user: any, @Body() submission: any) {
    return this.verificationService.submitToGhanaSingleWindow(
      user.sub,
      submission,
    );
  }

  @Get('status/:referenceNumber')
  @ApiOperation({
    summary: 'Check verification status',
    description:
      'Check the status of a Ghana Single Window verification request',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification status retrieved',
  })
  async getStatus(@Param('referenceNumber') referenceNumber: string) {
    return this.verificationService.checkVerificationStatus(referenceNumber);
  }

  @Post('approve/:userId')
  @ApiOperation({
    summary: 'Approve verification (Admin only)',
    description:
      'Approve a user verification after Ghana Single Window approval',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification approved',
  })
  async approveVerification(
    @Param('userId') userId: string,
    @CurrentUser() user: any,
    @Body() body: { referenceNumber: string; notes?: string },
  ) {
    return this.verificationService.approveVerification(
      userId,
      body.referenceNumber,
      user.sub,
      body.notes,
    );
  }

  @Get('eligibility')
  @ApiOperation({
    summary: 'Check export eligibility',
    description:
      'Check if the current user meets all requirements for international export',
  })
  @ApiResponse({
    status: 200,
    description: 'Eligibility status retrieved',
  })
  async checkEligibility(@CurrentUser() user: any) {
    return await this.verificationService.checkExportEligibility(user.sub);
  }

  @Get('compliance-requirements/:countryCode')
  @ApiOperation({
    summary: 'Get country-specific compliance requirements',
    description:
      'Get the compliance requirements for exporting to a specific country',
  })
  @ApiResponse({
    status: 200,
    description: 'Compliance requirements retrieved',
  })
  async getComplianceRequirements(@Param('countryCode') countryCode: string) {
    return this.verificationService.getCountryComplianceRequirements(
      countryCode,
    );
  }
}
