# Security & DDoS Protection Documentation

This document outlines all security measures implemented to protect the backend API from DDoS attacks and other security threats.

## Overview

The backend has been hardened with multiple layers of security protection, including:
- Enhanced HTTP security headers (Helmet.js)
- Multi-tier rate limiting
- Request timeout protection
- Connection limits
- Request size validation
- HTTP parameter pollution prevention

## Security Features

### 1. Enhanced Security Headers (Helmet.js)

Helmet.js is configured with comprehensive security headers:

- **Content Security Policy (CSP)**: Restricts resource loading to prevent XSS attacks
- **Cross-Origin Resource Policy**: Controls cross-origin resource access
- **DNS Prefetch Control**: Prevents DNS prefetching
- **Frameguard**: Prevents clickjacking by denying frame embedding
- **Hide Powered-By**: Removes X-Powered-By header to hide server technology
- **HTTP Strict Transport Security (HSTS)**: Forces HTTPS connections with 1-year max age
- **IE No Open**: Prevents Internet Explorer from executing downloads
- **No Sniff**: Prevents MIME type sniffing
- **Referrer Policy**: Controls referrer information
- **XSS Filter**: Enables browser XSS filter

### 2. Multi-Tier Rate Limiting

Three levels of rate limiting protect against DDoS attacks:

#### General API Rate Limiter
- **Window**: 15 minutes
- **Max Requests**: 
  - Production: 100 requests per 15 minutes per IP
  - Development: 1000 requests per 15 minutes per IP
- **Applies to**: All `/api/*` endpoints
- **Configurable via**: `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS` environment variables

#### Authentication Rate Limiter
- **Window**: 15 minutes
- **Max Requests**: 
  - Production: 5 attempts per 15 minutes per IP
  - Development: 20 attempts per 15 minutes per IP
- **Applies to**: All `/api/auth/*` endpoints
- **Special Feature**: Only counts failed authentication attempts (skipSuccessfulRequests: true)

#### Write Operations Rate Limiter
- **Window**: 15 minutes
- **Max Requests**: 
  - Production: 50 write operations per 15 minutes per IP
  - Development: 200 write operations per 15 minutes per IP
- **Applies to**: POST, PUT, PATCH, DELETE methods on `/api/*` endpoints

**Rate Limit Response**: When exceeded, returns HTTP 429 with JSON error message.

### 3. Request Timeout Protection

- **Default Timeout**: 30 seconds
- **Configurable via**: `REQUEST_TIMEOUT_MS` environment variable
- **Behavior**: Automatically terminates requests that exceed the timeout limit
- **Response**: HTTP 408 (Request Timeout) with error message

### 4. Server-Level Connection Limits

- **Max Connections**: 1000 concurrent connections (configurable via `MAX_CONNECTIONS`)
- **Keep-Alive Timeout**: 65 seconds (configurable via `KEEP_ALIVE_TIMEOUT_MS`)
- **Headers Timeout**: 66 seconds (configurable via `HEADERS_TIMEOUT_MS`)

These limits prevent resource exhaustion from too many concurrent connections.

### 5. Request Size Validation

- **Maximum Request Size**: 10MB
- **Validation**: Checks Content-Length header before processing
- **Response**: HTTP 413 (Payload Too Large) if exceeded
- **Purpose**: Prevents large payload attacks

### 6. HTTP Parameter Pollution Prevention

- **Protection**: Removes duplicate query parameters
- **Behavior**: Keeps first occurrence, removes subsequent duplicates
- **Purpose**: Prevents parameter pollution attacks

### 7. CORS Configuration

- **Origin**: Restricted to `FRONTEND_URL` environment variable (default: `http://localhost:5173`)
- **Credentials**: Enabled for authenticated requests
- **Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization

## Environment Variables

The following environment variables can be used to configure security settings:

```env
# Rate Limiting
RATE_LIMIT_ENABLED=false          # Set to "false" to disable in development (NOT recommended for production)
RATE_LIMIT_WINDOW_MS=900000       # Rate limit window in milliseconds (default: 15 minutes)
RATE_LIMIT_MAX_REQUESTS=100       # Max requests per window (default: 100 in production, 1000 in dev)

# Request Timeout
REQUEST_TIMEOUT_MS=30000          # Request timeout in milliseconds (default: 30 seconds)

# Server Connection Limits
MAX_CONNECTIONS=1000              # Maximum concurrent connections (default: 1000)
KEEP_ALIVE_TIMEOUT_MS=65000       # Keep-alive timeout in milliseconds (default: 65 seconds)
HEADERS_TIMEOUT_MS=66000          # Headers timeout in milliseconds (default: 66 seconds)

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

## Production Recommendations

1. **Always enable rate limiting in production** - Never set `RATE_LIMIT_ENABLED=false` in production
2. **Use HTTPS** - Ensure your deployment uses HTTPS (Helmet HSTS will enforce this)
3. **Monitor rate limit violations** - Log and alert on 429 responses to detect potential attacks
4. **Adjust limits based on traffic** - Monitor your API usage and adjust rate limits accordingly
5. **Use a reverse proxy** - Consider using nginx or a cloud load balancer for additional DDoS protection
6. **Enable logging** - Use `morgan("combined")` in production to log all requests for security analysis

## Testing Security

To test rate limiting in development:

```bash
# Test general rate limiter (should allow 1000 requests in dev)
for i in {1..1001}; do curl http://localhost:5000/api/health; done

# Test auth rate limiter (should allow 20 attempts in dev)
for i in {1..21}; do curl -X POST http://localhost:5000/api/auth/login; done
```

## Additional Security Considerations

While these measures provide strong DDoS protection, consider:

1. **IP Whitelisting/Blacklisting**: Implement IP-based access control for sensitive endpoints
2. **Geolocation Filtering**: Block requests from specific countries if not needed
3. **CAPTCHA**: Add CAPTCHA for authentication endpoints after multiple failures
4. **Cloud DDoS Protection**: Use services like Cloudflare, AWS Shield, or Azure DDoS Protection
5. **Load Balancing**: Distribute traffic across multiple servers
6. **Auto-scaling**: Scale resources automatically during traffic spikes

## Monitoring & Alerts

Monitor the following metrics:
- Rate limit violations (429 responses)
- Request timeouts (408 responses)
- Connection count
- Response times
- Error rates

Set up alerts for:
- Sudden spike in 429 responses (potential DDoS)
- High connection count approaching limits
- Increased error rates
- Unusual traffic patterns
