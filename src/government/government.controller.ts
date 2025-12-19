import { Controller, Get, Query, UseGuards, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GovernmentService } from './government.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Government')
@ApiBearerAuth('JWT-auth')
@Controller('government')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.GOVERNMENT_OFFICIAL, UserRole.ADMIN)
export class GovernmentController {
  constructor(private readonly governmentService: GovernmentService) {}

  @Get('single-window-status')
  @ApiOperation({ summary: 'Get Ghana Single Window integration status' })
  @ApiResponse({ status: 200, description: 'Single Window status retrieved successfully' })
  getSingleWindowStatus() {
    return this.governmentService.getSingleWindowStatus();
  }

  @Get('export-trends')
  @ApiOperation({ summary: 'Get export trends data' })
  @ApiResponse({ status: 200, description: 'Export trends retrieved successfully' })
  getExportTrends(@Query('range') range: '7d' | '30d' | '90d' | '1y' = '30d') {
    return this.governmentService.getExportTrends(range);
  }

  @Get('msme-participation')
  @ApiOperation({ summary: 'Get MSME participation statistics' })
  @ApiResponse({ status: 200, description: 'MSME participation data retrieved successfully' })
  getMSMEParticipation() {
    return this.governmentService.getMSMEParticipation();
  }

  @Get('commodity-flows')
  @ApiOperation({ summary: 'Get commodity flow data' })
  @ApiResponse({ status: 200, description: 'Commodity flows retrieved successfully' })
  getCommodityFlows() {
    return this.governmentService.getCommodityFlows();
  }

  @Get('compliance-metrics')
  @ApiOperation({ summary: 'Get compliance metrics' })
  @ApiResponse({ status: 200, description: 'Compliance metrics retrieved successfully' })
  getComplianceMetrics() {
    return this.governmentService.getComplianceMetrics();
  }

  @Post('sync-single-window')
  @ApiOperation({ summary: 'Sync with Ghana Single Window systems' })
  @ApiResponse({ status: 200, description: 'Sync completed successfully' })
  syncSingleWindow() {
    return this.governmentService.syncSingleWindow();
  }
}
