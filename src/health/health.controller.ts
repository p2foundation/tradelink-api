import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check() {
    const dbHealthy = await this.prisma.healthCheck();
    const stats = await this.prisma.getStats();

    return {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbHealthy,
        stats,
      },
      uptime: process.uptime(),
    };
  }
}

