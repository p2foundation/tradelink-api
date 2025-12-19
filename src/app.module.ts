import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FarmersModule } from './farmers/farmers.module';
import { BuyersModule } from './buyers/buyers.module';
import { ListingsModule } from './listings/listings.module';
import { MatchesModule } from './matches/matches.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiModule } from './ai/ai.module';
import { MarketInsightsModule } from './market-insights/market-insights.module';
import { ChatModule } from './chat/chat.module';
import { FinanceModule } from './finance/finance.module';
import { HealthModule } from './health/health.module';
import { NegotiationsModule } from './negotiations/negotiations.module';
import { PaymentsModule } from './payments/payments.module';
import { DocumentsModule } from './documents/documents.module';
import { SupplierNetworksModule } from './supplier-networks/supplier-networks.module';
import { VerificationModule } from './verification/verification.module';
import { GovernmentModule } from './government/government.module';
import { LoggerModule } from './common/logger/logger.module';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [databaseConfig],
    }),
    LoggerModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    FarmersModule,
    BuyersModule,
    ListingsModule,
    MatchesModule,
    TransactionsModule,
    AnalyticsModule,
    AiModule,
    MarketInsightsModule,
    ChatModule,
    FinanceModule,
    NegotiationsModule,
    PaymentsModule,
    DocumentsModule,
    SupplierNetworksModule,
    VerificationModule,
    GovernmentModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}

