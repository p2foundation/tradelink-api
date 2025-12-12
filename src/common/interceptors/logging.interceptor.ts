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
        userId: user?.sub || 'anonymous',
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
    const sanitized = { ...body };
    // Remove sensitive fields
    if (sanitized.password) sanitized.password = '[REDACTED]';
    if (sanitized.refreshToken) sanitized.refreshToken = '[REDACTED]';
    if (sanitized.accessToken) sanitized.accessToken = '[REDACTED]';
    return sanitized;
  }
}

