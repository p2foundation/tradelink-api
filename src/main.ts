import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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

  // Swagger/OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('TradeLink+ API')
    .setDescription(
      'TradeLink+ is a comprehensive agricultural trade platform connecting Ghanaian farmers with international buyers. ' +
      'This API provides endpoints for farmers, buyers, export companies, and administrators to manage listings, ' +
      'matches, negotiations, transactions, payments, logistics, and more.',
    )
    .setVersion('1.0.0')
    .addTag('Authentication', 'User authentication and authorization endpoints')
    .addTag('Farmers', 'Farmer profile and management endpoints')
    .addTag('Buyers', 'Buyer profile and management endpoints')
    .addTag('Listings', 'Product listing management endpoints')
    .addTag('Matches', 'AI-powered buyer-listing matching endpoints')
    .addTag('Negotiations', 'Price negotiation and offer management endpoints')
    .addTag('Transactions', 'Order and transaction management endpoints')
    .addTag('Payments', 'Payment processing and receipt management endpoints')
    .addTag('Documents', 'Document upload, verification, and management endpoints')
    .addTag('Supplier Networks', 'Export company supplier network management endpoints')
    .addTag('Logistics', 'Shipment tracking and logistics management endpoints')
    .addTag('Analytics', 'Platform analytics and reporting endpoints')
    .addTag('Market Insights', 'AI-powered market intelligence endpoints')
    .addTag('Finance', 'Trade finance and loan application endpoints')
    .addTag('Chat', 'AI chatbot endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Health', 'API health check endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .addServer('http://localhost:4000', 'Development Server')
    .addServer('https://api.tradelink.plus', 'Production Server')
    .setContact('TradeLink+ Support', 'https://tradelink.plus', 'support@tradelink.plus')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'TradeLink+ API Documentation',
    customfavIcon: 'https://tradelink.plus/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`🚀 TradeLink+ API running on: http://localhost:${port}/api`);
  logger.log(`📚 Swagger Documentation: http://localhost:${port}/api/docs`);
  logger.log(`📝 Logs directory: ${process.cwd()}/logs`);
  logger.log(`🔍 Log level: ${process.env.LOG_LEVEL || 'info'}`);
}

bootstrap();
