# Swagger/OpenAPI Documentation Setup

## Overview

TradeLink+ API now includes comprehensive Swagger/OpenAPI documentation to help mobile app developers and other API consumers integrate with the platform.

## Accessing the Documentation

Once the API server is running, access the Swagger UI at:

```
http://localhost:4000/api/docs
```

## Features

### 1. Interactive API Explorer
- Browse all available endpoints
- See request/response schemas
- Test endpoints directly from the browser
- View authentication requirements

### 2. Authentication
- JWT Bearer token authentication is configured
- Click the "Authorize" button in Swagger UI
- Enter your JWT token (without "Bearer " prefix)
- Token persists across page refreshes

### 3. Comprehensive Documentation
All endpoints are documented with:
- **Summary**: Brief description of what the endpoint does
- **Description**: Detailed explanation
- **Parameters**: Query params, path params, request body
- **Responses**: Status codes and response schemas
- **Tags**: Organized by feature area

## API Tags

Endpoints are organized into the following tags:

1. **Authentication** - User registration, login, token refresh
2. **Farmers** - Farmer profile management
3. **Buyers** - Buyer profile management
4. **Listings** - Product listing management
5. **Matches** - AI-powered buyer-listing matching
6. **Negotiations** - Price negotiation and offers
7. **Transactions** - Order and transaction management
8. **Payments** - Payment processing
9. **Documents** - Document upload and verification
10. **Supplier Networks** - Export company supplier management
11. **Logistics** - Shipment tracking
12. **Analytics** - Platform analytics
13. **Market Insights** - AI market intelligence
14. **Finance** - Trade finance
15. **Chat** - AI chatbot
16. **Users** - User management
17. **Health** - API health checks

## Using Swagger for Mobile Development

### 1. Generate Client SDKs

Swagger/OpenAPI allows you to generate client SDKs for various platforms:

#### Using Swagger Codegen
```bash
# Generate TypeScript client
swagger-codegen generate -i http://localhost:4000/api/docs-json -l typescript-axios -o ./mobile-sdk

# Generate Swift client (iOS)
swagger-codegen generate -i http://localhost:4000/api/docs-json -l swift5 -o ./ios-sdk

# Generate Kotlin client (Android)
swagger-codegen generate -i http://localhost:4000/api/docs-json -l kotlin -o ./android-sdk
```

#### Using OpenAPI Generator
```bash
# Install OpenAPI Generator
npm install @openapitools/openapi-generator-cli -g

# Generate TypeScript client
openapi-generator-cli generate -i http://localhost:4000/api/docs-json -g typescript-axios -o ./mobile-sdk

# Generate Swift client
openapi-generator-cli generate -i http://localhost:4000/api/docs-json -g swift5 -o ./ios-sdk

# Generate Kotlin client
openapi-generator-cli generate -i http://localhost:4000/api/docs-json -g kotlin -o ./android-sdk
```

### 2. Export OpenAPI Spec

Get the raw OpenAPI JSON specification:

```
http://localhost:4000/api/docs-json
```

This can be:
- Imported into Postman
- Used with API testing tools
- Shared with frontend/mobile teams
- Used for API mocking

### 3. Testing Endpoints

1. **Get Authentication Token**:
   - Use `/api/auth/login` endpoint
   - Copy the `accessToken` from response
   - Click "Authorize" in Swagger UI
   - Paste token and click "Authorize"

2. **Test Protected Endpoints**:
   - All endpoints marked with 🔒 require authentication
   - After authorization, you can test any endpoint
   - Responses show in real-time

## Example: Mobile Integration Flow

### 1. Authentication
```typescript
// Login
const response = await fetch('http://localhost:4000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { accessToken, refreshToken, user } = await response.json();

// Store tokens securely
await SecureStore.setItemAsync('accessToken', accessToken);
await SecureStore.setItemAsync('refreshToken', refreshToken);
```

### 2. Making Authenticated Requests
```typescript
const token = await SecureStore.getItemAsync('accessToken');

const listingsResponse = await fetch('http://localhost:4000/api/listings', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const listings = await listingsResponse.json();
```

### 3. Error Handling
```typescript
if (response.status === 401) {
  // Token expired, refresh it
  const refreshToken = await SecureStore.getItemAsync('refreshToken');
  const refreshResponse = await fetch('http://localhost:4000/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });
  // Update tokens and retry request
}
```

## Best Practices

1. **Always use HTTPS in production**
2. **Store tokens securely** (use secure storage, never in plain text)
3. **Implement token refresh** before expiration
4. **Handle pagination** for list endpoints
5. **Validate responses** before using data
6. **Implement retry logic** for network failures
7. **Cache responses** when appropriate
8. **Use appropriate HTTP methods** (GET for read, POST for create, etc.)

## API Base URLs

- **Development**: `http://localhost:4000/api`
- **Production**: `https://api.tradelink.plus/api`

## Support

For API questions or issues:
- Check Swagger documentation first
- Review endpoint descriptions and examples
- Contact: support@tradelink.plus

## Updating Documentation

Documentation is automatically generated from:
- Controller decorators (`@ApiTags`, `@ApiOperation`, etc.)
- DTO classes (request/response schemas)
- Main.ts Swagger configuration

To add documentation to a new endpoint:
1. Add `@ApiTags('TagName')` to controller
2. Add `@ApiOperation({ summary, description })` to methods
3. Add `@ApiResponse()` decorators for status codes
4. Add `@ApiQuery()` or `@ApiParam()` for parameters
5. Add `@ApiBearerAuth('JWT-auth')` for protected endpoints

