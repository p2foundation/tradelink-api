import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getDashboard() {
    return this.analyticsService.getDashboard();
  }

  @Get('trends')
  getTrends(
    @Query('period') period?: 'daily' | 'weekly' | 'monthly',
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getTrends(
      period || 'daily',
      days ? parseInt(days) : 30,
    );
  }
}

