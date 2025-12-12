import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject } from '@nestjs/common';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggingMiddleware.name);

  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly winstonLogger: any) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    // Log request
    this.winstonLogger.log({
      level: 'info',
      message: `Incoming Request: ${method} ${originalUrl}`,
      context: 'HTTP',
      meta: {
        method,
        url: originalUrl,
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
      },
    });

    // Log response
    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      const logLevel = statusCode >= 400 ? 'error' : 'info';

      this.winstonLogger.log({
        level: logLevel,
        message: `Outgoing Response: ${method} ${originalUrl} ${statusCode}`,
        context: 'HTTP',
        meta: {
          method,
          url: originalUrl,
          statusCode,
          duration: `${duration}ms`,
          ip,
          timestamp: new Date().toISOString(),
        },
      });
    });

    next();
  }
}

