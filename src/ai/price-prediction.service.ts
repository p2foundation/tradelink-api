import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PricePredictionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Simple moving average price prediction
   * For MVP, this is a basic implementation
   * Future: Use ML models for better predictions
   */
  async predictPrice(
    cropType: string,
    qualityGrade: string,
    daysAhead: number = 30,
  ): Promise<{ min: number; max: number; avg: number }> {
    // Get historical transaction prices for this crop and quality
    const transactions = await this.prisma.transaction.findMany({
      where: {
        match: {
          listing: {
            cropType,
            qualityGrade: qualityGrade as any,
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
    });

    if (transactions.length === 0) {
      // No historical data, return current listing prices
      const listings = await this.prisma.listing.findMany({
        where: {
          cropType,
          qualityGrade: qualityGrade as any,
          status: 'ACTIVE',
        },
        take: 10,
      });

      if (listings.length === 0) {
        return { min: 0, max: 0, avg: 0 };
      }

      const prices = listings.map((l) => l.pricePerUnit);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const min = Math.min(...prices);
      const max = Math.max(...prices);

      return { min, max, avg };
    }

    // Calculate moving average
    const prices = transactions.map((tx) => tx.agreedPrice);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

    // Calculate standard deviation for min/max range
    const variance =
      prices.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    // Predict with some variance
    const predictedAvg = avg; // Simple: assume stable prices
    const predictedMin = Math.max(0, predictedAvg - stdDev * 0.5);
    const predictedMax = predictedAvg + stdDev * 0.5;

    return {
      min: Math.round(predictedMin * 100) / 100,
      max: Math.round(predictedMax * 100) / 100,
      avg: Math.round(predictedAvg * 100) / 100,
    };
  }
}

