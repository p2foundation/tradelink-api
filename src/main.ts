import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Use Winston logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Enable CORS
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  // In development, also allow local network IPs
  const isDevelopment = process.env.NODE_ENV !== 'production';

  app.enableCors({
    origin(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Check exact matches first
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In development, allow local network IPs on port 3000
      if (isDevelopment) {
        const localNetworkPattern =
          /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|127\.0\.0\.1):3000$/;
        if (localNetworkPattern.test(origin)) {
          return callback(null, true);
        }
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`🚀 TradeLink+ API running on: http://localhost:${port}/api`);
  logger.log(`📝 Logs directory: ${process.cwd()}/logs`);
  logger.log(`🔍 Log level: ${process.env.LOG_LEVEL || 'info'}`);
}

bootstrap();
