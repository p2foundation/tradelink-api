import { Module } from '@nestjs/common';
import { MarketInsightsController } from './market-insights.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [MarketInsightsController],
})
export class MarketInsightsModule {}

