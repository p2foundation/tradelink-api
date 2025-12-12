import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MatchingService } from './matching.service';
import { PricePredictionService } from './price-prediction.service';
import { AiClientService } from './ai-client.service';
import { MarketInsightsService } from './market-insights.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [
    MatchingService,
    PricePredictionService,
    AiClientService,
    MarketInsightsService,
  ],
  exports: [
    MatchingService,
    PricePredictionService,
    AiClientService,
    MarketInsightsService,
  ],
})
export class AiModule {}

