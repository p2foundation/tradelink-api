import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get<string>('DATABASE_URL'),
        },
      },
      log: ['error', 'warn'],
    });

  }

  async onModuleInit() {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`Attempting database connection (${attempt}/${maxRetries})...`);
        await this.$connect();
        this.logger.log('✅ Database connected successfully');
        
        // Set timezone for the connection (this works with pooler)
        try {
          await this.$executeRaw`SET timezone = 'Africa/Accra'`;
        } catch (error) {
          // Ignore timezone errors (may not be supported in all contexts)
          this.logger.debug('Timezone setting skipped');
        }
        
        // Note: Extensions must be created via Supabase SQL Editor (Direct Connection)
        // Transaction Pooler doesn't support DDL operations like CREATE EXTENSION
        // Extensions are created during migration in Supabase SQL Editor
        this.logger.log('✅ Database ready (extensions should be created via SQL migration)');
        return; // Success, exit retry loop
      } catch (error: any) {
        this.logger.warn(`Connection attempt ${attempt} failed: ${error.message}`);
        
        if (attempt === maxRetries) {
          this.logger.error('❌ Database connection failed after all retries');
          this.logger.error('Please check:');
          this.logger.error('1. Your DATABASE_URL in .env file');
          this.logger.error('2. Network connectivity to Supabase');
          this.logger.error('3. Try using Direct Connection instead of Session Pooler');
          this.logger.error('4. Ensure SSL mode is set: sslmode=require');
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      const [userCount, farmerCount, buyerCount, listingCount, transactionCount] =
        await Promise.all([
          this.user.count(),
          this.farmer.count(),
          this.buyer.count(),
          this.listing.count(),
          this.transaction.count(),
        ]);

      return {
        users: userCount,
        farmers: farmerCount,
        buyers: buyerCount,
        listings: listingCount,
        transactions: transactionCount,
      };
    } catch (error) {
      this.logger.error('Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old data (for maintenance)
   */
  async cleanupOldData(daysOld: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    try {
      // Example: Clean up expired listings
      const result = await this.listing.updateMany({
        where: {
          status: 'EXPIRED',
          updatedAt: {
            lt: cutoffDate,
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      this.logger.log(`Cleaned up ${result.count} old records`);
      return result;
    } catch (error) {
      this.logger.error('Cleanup failed:', error);
      throw error;
    }
  }
}
