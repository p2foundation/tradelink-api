import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const [
      totalFarmers,
      totalBuyers,
      totalListings,
      activeMatches,
      totalTransactions,
      totalTradeValue,
      recentTransactions,
    ] = await Promise.all([
      this.prisma.farmer.count(),
      this.prisma.buyer.count(),
      this.prisma.listing.count({ where: { status: 'ACTIVE' } }),
      this.prisma.match.count({
        where: {
          status: {
            in: ['SUGGESTED', 'CONTACTED', 'NEGOTIATING', 'CONTRACT_SIGNED'],
          },
        },
      }),
      this.prisma.transaction.count(),
      this.prisma.transaction.aggregate({
        _sum: {
          totalValue: true,
        },
      }),
      this.prisma.transaction.findMany({
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          match: {
            include: {
              listing: true,
            },
          },
          buyer: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Calculate price improvement (simplified - compare listing price vs transaction price)
    const transactionsWithListings = await this.prisma.transaction.findMany({
      include: {
        match: {
          include: {
            listing: true,
          },
        },
      },
      take: 100,
    });

    let totalImprovement = 0;
    let improvementCount = 0;

    transactionsWithListings.forEach((tx) => {
      const listingPrice = tx.match.listing.pricePerUnit;
      const transactionPrice = tx.agreedPrice;
      if (transactionPrice > listingPrice) {
        const improvement = ((transactionPrice - listingPrice) / listingPrice) * 100;
        totalImprovement += improvement;
        improvementCount++;
      }
    });

    const avgPriceImprovement = improvementCount > 0 ? totalImprovement / improvementCount : 0;

    return {
      metrics: {
        totalFarmers,
        totalBuyers,
        totalListings,
        activeMatches,
        totalTransactions,
        totalTradeValue: totalTradeValue._sum.totalValue || 0,
        avgPriceImprovement: Math.round(avgPriceImprovement * 100) / 100,
      },
      recentTransactions,
    };
  }

  async getTrends(period: 'daily' | 'weekly' | 'monthly' = 'daily', days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
        totalValue: true,
      },
    });

    // Group by period
    const grouped: Record<string, { date: string; value: number; count: number }> = {};

    transactions.forEach((tx) => {
      let key: string;
      const date = new Date(tx.createdAt);

      if (period === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = { date: key, value: 0, count: 0 };
      }

      grouped[key].value += tx.totalValue;
      grouped[key].count += 1;
    });

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }

  async updateDailyAnalytics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalFarmers,
      totalBuyers,
      totalListings,
      activeMatches,
      dailyTradeValue,
    ] = await Promise.all([
      this.prisma.farmer.count(),
      this.prisma.buyer.count(),
      this.prisma.listing.count({ where: { status: 'ACTIVE' } }),
      this.prisma.match.count({
        where: {
          status: {
            in: ['SUGGESTED', 'CONTACTED', 'NEGOTIATING', 'CONTRACT_SIGNED'],
          },
        },
      }),
      this.prisma.transaction.aggregate({
        where: {
          createdAt: {
            gte: today,
          },
        },
        _sum: {
          totalValue: true,
        },
      }),
    ]);

    await this.prisma.analytics.upsert({
      where: { date: today },
      update: {
        totalFarmers,
        totalBuyers,
        totalListings,
        activeMatches,
        dailyTradeValue: dailyTradeValue._sum.totalValue || 0,
      },
      create: {
        date: today,
        totalFarmers,
        totalBuyers,
        totalListings,
        activeMatches,
        dailyTradeValue: dailyTradeValue._sum.totalValue || 0,
      },
    });
  }
}

