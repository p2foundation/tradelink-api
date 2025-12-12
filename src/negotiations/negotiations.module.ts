import { Module } from '@nestjs/common';
import { NegotiationsService } from './negotiations.service';
import { NegotiationsController } from './negotiations.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [NegotiationsController],
  providers: [NegotiationsService, PrismaService],
  exports: [NegotiationsService],
})
export class NegotiationsModule {}

