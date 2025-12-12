# Logging System Documentation

## Overview

The TradeLink+ API uses a comprehensive logging system built on Winston to track all activities, errors, and system events. This helps with debugging, monitoring, and understanding what's happening in the system.

## Logging Infrastructure

### Components

1. **Winston Logger Module** (`src/common/logger/logger.module.ts`)
   - Configures Winston with multiple transports
   - Console output for development
   - File-based logging for production
   - Separate log files for errors, requests, and combined logs

2. **Logging Middleware** (`src/common/middleware/logging.middleware.ts`)
   - Logs all HTTP requests and responses
   - Tracks request duration, status codes, IP addresses
   - Logs to `logs/requests.log`

3. **Logging Interceptor** (`src/common/interceptors/logging.interceptor.ts`)
   - Logs API endpoint calls with context
   - Tracks controller and handler names
   - Logs request parameters, query strings, and sanitized body
   - Tracks success and error responses

4. **Service-Level Logging**
   - All services use NestJS Logger
   - Logs operations, errors, and important events
   - Context-aware logging with service names

## Log Files

All logs are stored in the `logs/` directory:

- **`error.log`** - Only error-level logs
- **`combined.log`** - All logs (info, warn, error)
- **`requests.log`** - HTTP request/response logs
- **`exceptions.log`** - Unhandled exceptions
- **`rejections.log`** - Unhandled promise rejections

## Log Levels

- **`error`** - Error events that might still allow the application to continue
- **`warn`** - Warning messages for potentially harmful situations
- **`info`** - Informational messages about general application flow
- **`debug`** - Detailed information for debugging
- **`verbose`** - Very detailed information

Set log level via environment variable:
```bash
LOG_LEVEL=debug
```

## What Gets Logged

### Authentication Events
- User registration attempts and results
- Login attempts (successful and failed)
- Token generation and refresh
- User validation

### Database Operations
- Connection attempts and status
- Query errors
- Database health checks

### API Operations
- All HTTP requests (method, URL, IP, user agent)
- All HTTP responses (status code, duration)
- Controller and handler execution
- Request parameters and query strings
- Error responses with stack traces

### Business Logic
- Service method calls
- Data creation, updates, deletions
- Business rule validations
- External API calls

## Log Format

### Console Output
```
2025-01-15 10:30:45 info [AuthService] Login successful: user@example.com (123)
```

### File Output (JSON)
```json
{
  "timestamp": "2025-01-15 10:30:45",
  "level": "info",
  "message": "Login successful: user@example.com (123)",
  "context": "AuthService",
  "meta": {
    "userId": "123",
    "email": "user@example.com",
    "role": "FARMER"
  }
}
```

## Security Considerations

- **Sensitive Data**: Passwords, tokens, and other sensitive fields are automatically redacted in logs
- **User Privacy**: User IDs and emails are logged, but full user objects are sanitized
- **Request Bodies**: Sensitive fields in request bodies are replaced with `[REDACTED]`

## Usage in Services

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MyService {
  private readonly logger = new Logger(MyService.name);

  async myMethod() {
    this.logger.log('Operation started');
    
    try {
      // ... operation code
      this.logger.log('Operation completed successfully');
    } catch (error) {
      this.logger.error(`Operation failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

## Log Rotation

Log files are automatically rotated:
- Maximum file size: 5MB
- Maximum files: 5 per log type
- Old files are automatically archived

## Monitoring

### Viewing Logs

**Real-time console output:**
```bash
npm run dev
```

**View error logs:**
```bash
tail -f logs/error.log
```

**View all requests:**
```bash
tail -f logs/requests.log
```

**Search logs:**
```bash
grep "Login" logs/combined.log
```

## Best Practices

1. **Use Appropriate Log Levels**
   - `error` for exceptions and failures
   - `warn` for potentially problematic situations
   - `info` for important business events
   - `debug` for detailed debugging information

2. **Include Context**
   - Always include relevant IDs (userId, orderId, etc.)
   - Log before and after important operations
   - Include error stack traces

3. **Don't Log Sensitive Data**
   - Never log passwords, tokens, or credit card numbers
   - The interceptor automatically sanitizes common sensitive fields

4. **Log Important Business Events**
   - User registrations
   - Order creation/updates
   - Payment processing
   - External API calls

## Troubleshooting

### Logs Not Appearing

1. Check that the `logs/` directory exists and is writable
2. Verify `LOG_LEVEL` environment variable is set correctly
3. Check file permissions on the logs directory

### Too Many Logs

1. Increase log level to `warn` or `error` in production
2. Adjust log rotation settings if needed
3. Review and remove unnecessary debug logs

### Missing Logs

1. Check that Winston module is properly imported in `app.module.ts`
2. Verify middleware and interceptor are registered
3. Check for errors in the console during startup

## Environment Variables

```bash
# Log level (error, warn, info, debug, verbose)
LOG_LEVEL=info

# Log directory (default: ./logs)
LOG_DIR=./logs
```

## Future Enhancements

- Integration with external logging services (Datadog, LogRocket, etc.)
- Structured logging with correlation IDs
- Performance metrics logging
- Audit trail for compliance
- Real-time log streaming

