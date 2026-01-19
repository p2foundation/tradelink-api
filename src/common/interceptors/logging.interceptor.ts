import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly winstonLogger: any) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, params, query, user } = request;
    const controller = context.getClass().name;
    const handler = context.getHandler().name;
    const startTime = Date.now();

    // Log request details
    this.winstonLogger.log({
      level: 'info',
      message: `[${controller}] ${handler} - ${method} ${url}`,
      context: 'API',
      meta: {
        controller,
        handler,
        method,
        url,
        params,
        query,
        body: this.sanitizeBody(body),
        userId: user?.sub || user?.userId || 'anonymous',
        timestamp: new Date().toISOString(),
      },
    });

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        this.winstonLogger.log({
          level: 'info',
          message: `[${controller}] ${handler} - Success`,
          context: 'API',
          meta: {
            controller,
            handler,
            method,
            url,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          },
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.winstonLogger.error({
          level: 'error',
          message: `[${controller}] ${handler} - Error: ${error.message}`,
          context: 'API',
          meta: {
            controller,
            handler,
            method,
            url,
            error: {
              message: error.message,
              stack: error.stack,
              status: error.status || error.statusCode || 500,
            },
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          },
        });
        return throwError(() => error);
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    if (Array.isArray(body)) {
      return body.map((item) => this.sanitizeBody(item));
    }

    if (typeof body === 'string') {
      return body.length > 500 ? `${body.slice(0, 500)}...[truncated]` : body;
    }

    if (typeof body !== 'object') {
      return body;
    }

    const sanitized: Record<string, any> = {};
    const sensitiveKeys = new Set([
      'password',
      'refreshToken',
      'accessToken',
      'token',
      'fileUrl',
      'receiptDocument',
      'invoiceDocument',
      'contractDocument',
      'providerResponse',
    ]);

    Object.entries(body).forEach(([key, value]) => {
      const normalizedKey = key.toLowerCase();
      if (
        sensitiveKeys.has(key) ||
        normalizedKey.includes('password') ||
        normalizedKey.includes('token') ||
        normalizedKey.includes('secret') ||
        normalizedKey.includes('document') ||
        normalizedKey.includes('file')
      ) {
        sanitized[key] = '[REDACTED]';
        return;
      }

      sanitized[key] = this.sanitizeBody(value);
    });

    return sanitized;
  }
}

