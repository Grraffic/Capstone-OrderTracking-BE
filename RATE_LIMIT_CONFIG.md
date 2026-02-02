# Rate Limiting Configuration

This document explains how to configure rate limiting via environment variables in your `.env` file.

## Backend Rate Limiting (.env)

Add these variables to your `backend/.env` file:

```env
# ============================================================================
# RATE LIMITING CONFIGURATION
# ============================================================================

# General API Rate Limiting
# Window in milliseconds (default: 15 minutes = 900000ms)
RATE_LIMIT_WINDOW_MS=900000

# Maximum requests per window per IP (default: 300 in production, 1000 in development)
RATE_LIMIT_MAX_REQUESTS=300

# Enable/Disable rate limiting (set to "false" to disable, only works in development)
RATE_LIMIT_ENABLED=true

# Authentication Rate Limiting (stricter for security)
# Window in milliseconds (default: 15 minutes = 900000ms)
AUTH_RATE_LIMIT_WINDOW_MS=900000

# Maximum auth requests per window per IP (default: 5 in production, 20 in development)
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# Write Operations Rate Limiting (POST, PUT, PATCH, DELETE)
# Window in milliseconds (default: 15 minutes = 900000ms)
WRITE_RATE_LIMIT_WINDOW_MS=900000

# Maximum write requests per window per IP (default: 300 in production, 500 in development)
WRITE_RATE_LIMIT_MAX_REQUESTS=300
```

## Frontend Rate Limiting (.env)

Add these variables to your `frontend/.env` file:

**Note:** Vite requires `VITE_` prefix for environment variables to be exposed to the client.

```env
# ============================================================================
# RATE LIMITING CONFIGURATION (Frontend)
# ============================================================================
# These should be slightly lower than backend limits to trip the frontend limiter first

# General API Rate Limiting
# Window in milliseconds (default: 15 minutes = 900000ms)
VITE_RATE_LIMIT_WINDOW_MS=900000

# Maximum requests per window (default: 260, slightly below backend's 300)
VITE_RATE_LIMIT_MAX_REQUESTS=260

# Authentication Rate Limiting
# Window in milliseconds (default: 15 minutes = 900000ms)
VITE_AUTH_RATE_LIMIT_WINDOW_MS=900000

# Maximum auth requests per window (default: 4, slightly below backend's 5)
VITE_AUTH_RATE_LIMIT_MAX_REQUESTS=4

# Write Operations Rate Limiting
# Window in milliseconds (default: 15 minutes = 900000ms)
VITE_WRITE_RATE_LIMIT_WINDOW_MS=900000

# Maximum write requests per window (default: 260, slightly below backend's 300)
VITE_WRITE_RATE_LIMIT_MAX_REQUESTS=260
```

## Default Values

If environment variables are not set, the following defaults are used:

### Backend
- **General API**: 300 requests per 15 minutes (production), 1000 requests per 15 minutes (development)
- **Authentication**: 5 requests per 15 minutes (production), 20 requests per 15 minutes (development)
- **Write Operations**: 300 requests per 15 minutes (production), 500 requests per 15 minutes (development)

### Frontend
- **General API**: 260 requests per 15 minutes
- **Authentication**: 4 requests per 15 minutes
- **Write Operations**: 260 requests per 15 minutes

## Usage

1. Copy the configuration above to your respective `.env` files
2. Adjust the values as needed for your use case
3. Restart your backend and frontend servers for changes to take effect

## Notes

- Frontend limits should be slightly lower than backend limits to ensure the frontend limiter trips first
- Rate limiting windows are in milliseconds (15 minutes = 900000ms)
- Setting `RATE_LIMIT_ENABLED=false` disables rate limiting (development only)
- All rate limiters use a 15-minute window by default
