import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AiClientService } from './ai-client.service';
import { PricePredictionService } from './price-prediction.service';

export interface MarketInsight {
  cropType: string;
  summary: string;
  trends: string[];
  recommendations: string[];
  priceForecast: string;
  pricePrediction: {
    min: number;
    max: number;
    avg: number;
  };
  marketMetrics: {
    activeListings: number;
    avgPrice: number;
    totalVolume: number;
    recentTransactions: number;
    priceChange: number;
  };
  generatedAt: Date;
}

@Injectable()
export class MarketInsightsService {
  private readonly logger = new Logger(MarketInsightsService.name);

  constructor(
    private prisma: PrismaService,
    private aiClient: AiClientService,
    private pricePrediction: PricePredictionService,
  ) {}

  /**
   * Generate comprehensive market insights for a specific crop
   */
  async generateCropInsights(cropType: string): Promise<MarketInsight> {
    this.logger.log(`Generating market insights for ${cropType}`);

    // Gather market data
    const marketData = await this.gatherMarketData(cropType);

    // Get price prediction
    const pricePrediction = await this.pricePrediction.predictPrice(
      cropType,
      'GRADE_A', // Default grade, can be made dynamic
      30,
    );

    // Generate AI insights
    const aiInsights = await this.aiClient.generateMarketInsights(cropType, marketData);

    // Get price prediction explanation
    const priceForecastExplanation = await this.aiClient.generatePricePredictionExplanation(
      cropType,
      pricePrediction,
      marketData.historicalTransactions || [],
    );

    return {
      cropType,
      summary: aiInsights.summary,
      trends: aiInsights.trends,
      recommendations: aiInsights.recommendations,
      priceForecast: priceForecastExplanation,
      pricePrediction,
      marketMetrics: {
        activeListings: marketData.activeListings,
        avgPrice: marketData.avgPrice,
        totalVolume: marketData.totalVolume,
        recentTransactions: marketData.recentTransactions,
        priceChange: marketData.priceChange,
      },
      generatedAt: new Date(),
    };
  }

  /**
   * Generate insights for multiple crops
   */
  async generateMultiCropInsights(cropTypes: string[]): Promise<MarketInsight[]> {
    const insights = await Promise.all(
      cropTypes.map((crop) => this.generateCropInsights(crop)),
    );
    return insights;
  }

  /**
   * Get general market overview insights
   */
  async generateMarketOverview(): Promise<{
    overallSummary: string;
    topOpportunities: string[];
    marketAlerts: string[];
    cropInsights: MarketInsight[];
  }> {
    // Get top crops by activity
    const topCrops = await this.getTopCropsByActivity(5);

    // Generate insights for top crops
    const cropInsights = await this.generateMultiCropInsights(
      topCrops.map((c) => c.cropType),
    );

    // Generate overall summary
    const overallSummary = await this.generateOverallSummary(cropInsights);

    // Identify opportunities
    const topOpportunities = this.identifyOpportunities(cropInsights);

    // Generate alerts
    const marketAlerts = this.generateAlerts(cropInsights);

    return {
      overallSummary,
      topOpportunities,
      marketAlerts,
      cropInsights,
    };
  }

  /**
   * Gather market data for a specific crop
   */
  private async gatherMarketData(cropType: string) {
    const [listings, transactions, historicalTransactions] = await Promise.all([
      // Active listings
      this.prisma.listing.findMany({
        where: {
          cropType,
          status: 'ACTIVE',
        },
        select: {
          pricePerUnit: true,
          quantity: true,
          createdAt: true,
        },
      }),

      // Recent transactions (last 30 days)
      this.prisma.transaction.findMany({
        where: {
          match: {
            listing: {
              cropType,
            },
          },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          match: {
            include: {
              listing: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      }),

      // Historical transactions for trend analysis
      this.prisma.transaction.findMany({
        where: {
          match: {
            listing: {
              cropType,
            },
          },
        },
        include: {
          match: {
            include: {
              listing: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      }),
    ]);

    // Calculate metrics
    const activeListings = listings.length;
    const avgPrice =
      listings.length > 0
        ? listings.reduce((sum, l) => sum + l.pricePerUnit, 0) / listings.length
        : 0;
    const totalVolume = listings.reduce((sum, l) => sum + l.quantity, 0);
    const recentTransactions = transactions.length;

    // Calculate price change (compare last 7 days vs previous 7 days)
    const now = new Date();
    const last7Days = transactions.filter(
      (t) => t.createdAt >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    );
    const previous7Days = transactions.filter(
      (t) =>
        t.createdAt >= new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) &&
        t.createdAt < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    );

    const last7Avg =
      last7Days.length > 0
        ? last7Days.reduce((sum, t) => sum + t.agreedPrice, 0) / last7Days.length
        : avgPrice;
    const prev7Avg =
      previous7Days.length > 0
        ? previous7Days.reduce((sum, t) => sum + t.agreedPrice, 0) / previous7Days.length
        : avgPrice;

    const priceChange = prev7Avg > 0 ? ((last7Avg - prev7Avg) / prev7Avg) * 100 : 0;

    // Determine price trend
    let priceTrend = 'stable';
    if (priceChange > 5) priceTrend = 'increasing';
    else if (priceChange < -5) priceTrend = 'decreasing';

    return {
      activeListings,
      avgPrice: Math.round(avgPrice * 100) / 100,
      totalVolume,
      recentTransactions,
      priceChange: Math.round(priceChange * 100) / 100,
      priceTrend,
      historicalTransactions,
    };
  }

  /**
   * Get top crops by activity
   */
  private async getTopCropsByActivity(limit: number = 5) {
    const listings = await this.prisma.listing.groupBy({
      by: ['cropType'],
      where: {
        status: 'ACTIVE',
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: limit,
    });

    return listings.map((l) => ({
      cropType: l.cropType,
      count: l._count.id,
    }));
  }

  /**
   * Generate overall market summary
   */
  private async generateOverallSummary(insights: MarketInsight[]): Promise<string> {
    const totalListings = insights.reduce(
      (sum, i) => sum + i.marketMetrics.activeListings,
      0,
    );
    const avgPrice = insights.reduce(
      (sum, i) => sum + i.marketMetrics.avgPrice,
      0,
    ) / insights.length;

    return `The agricultural commodity market shows ${totalListings} active listings across ${insights.length} major crop types, with an average price of ${avgPrice.toFixed(2)}. Market activity is ${totalListings > 50 ? 'strong' : 'moderate'} with positive trends in key commodities.`;
  }

  /**
   * Identify market opportunities
   */
  private identifyOpportunities(insights: MarketInsight[]): string[] {
    const opportunities: string[] = [];

    // Find crops with increasing prices
    const increasingPrice = insights.filter((i) => i.marketMetrics.priceChange > 5);
    if (increasingPrice.length > 0) {
      opportunities.push(
        `${increasingPrice[0].cropType} prices are rising (${increasingPrice[0].marketMetrics.priceChange.toFixed(1)}%) - good time to list`,
      );
    }

    // Find crops with high demand (many listings)
    const highDemand = insights
      .sort((a, b) => b.marketMetrics.activeListings - a.marketMetrics.activeListings)
      .slice(0, 2);
    if (highDemand.length > 0) {
      opportunities.push(
        `${highDemand[0].cropType} has high market activity (${highDemand[0].marketMetrics.activeListings} active listings)`,
      );
    }

    // Find crops with good price predictions
    const goodForecast = insights.filter(
      (i) => i.pricePrediction.avg > i.marketMetrics.avgPrice * 1.1,
    );
    if (goodForecast.length > 0) {
      opportunities.push(
        `${goodForecast[0].cropType} shows positive price forecast - consider strategic positioning`,
      );
    }

    return opportunities.length > 0
      ? opportunities
      : ['Monitor market trends for emerging opportunities'];
  }

  /**
   * Generate market alerts
   */
  private generateAlerts(insights: MarketInsight[]): string[] {
    const alerts: string[] = [];

    // Price drop alerts
    const priceDrops = insights.filter((i) => i.marketMetrics.priceChange < -10);
    if (priceDrops.length > 0) {
      alerts.push(
        `⚠️ ${priceDrops[0].cropType} prices dropped ${Math.abs(priceDrops[0].marketMetrics.priceChange).toFixed(1)}% - review pricing strategy`,
      );
    }

    // Low activity alerts
    const lowActivity = insights.filter((i) => i.marketMetrics.activeListings < 3);
    if (lowActivity.length > 0) {
      alerts.push(
        `📊 ${lowActivity[0].cropType} has limited listings (${lowActivity[0].marketMetrics.activeListings}) - potential supply gap`,
      );
    }

    return alerts.length > 0 ? alerts : ['No critical alerts at this time'];
  }
}

