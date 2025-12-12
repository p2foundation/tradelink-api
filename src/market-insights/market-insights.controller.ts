import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MarketInsightsService } from '../ai/market-insights.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('market-insights')
@UseGuards(JwtAuthGuard)
export class MarketInsightsController {
  constructor(private marketInsightsService: MarketInsightsService) {}

  /**
   * Get market insights for a specific crop
   */
  @Get('crop')
  async getCropInsights(@Query('cropType') cropType: string) {
    if (!cropType) {
      throw new Error('cropType query parameter is required');
    }
    return this.marketInsightsService.generateCropInsights(cropType);
  }

  /**
   * Get overall market overview
   */
  @Get('overview')
  async getMarketOverview() {
    return this.marketInsightsService.generateMarketOverview();
  }

  /**
   * Get insights for multiple crops
   */
  @Get('multi-crop')
  async getMultiCropInsights(@Query('crops') crops: string) {
    const cropTypes = crops ? crops.split(',') : [];
    if (cropTypes.length === 0) {
      throw new Error('crops query parameter is required (comma-separated)');
    }
    return this.marketInsightsService.generateMultiCropInsights(cropTypes);
  }
}

