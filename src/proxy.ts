/**
 * @fileoverview Proxy for rate limiting and request handling
 * 
 * This proxy provides:
 * - IP-based rate limiting for API endpoints
 * - Stricter rate limits for resource-intensive operations (file uploads)
 * - Rate limit headers in responses for client awareness
 * - Test mode bypass for automated testing
 * 
 * Rate Limiting Configuration:
 * - General API: 20 requests per minute per IP
 * - Resume Grading (POST): 5 requests per minute per IP
 * 
 * Test Mode:
 * - Include header 'X-Test-Mode: true' to bypass rate limiting
 * - Only works in development/test environments
 * 
 * Note: This uses in-memory storage which resets on server restart.
 * For production, consider using Redis or a distributed store.
 * 
 * @module proxy
 * @requires next/server - NextResponse, NextRequest
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

/** Time window for rate limiting in milliseconds (1 minute) */
const RATE_LIMIT_WINDOW = 60 * 1000

/** Maximum general API requests per window per IP */
const RATE_LIMIT_MAX_REQUESTS = 20

/** Maximum upload requests per window per IP (stricter for resource-intensive operations) */
const RATE_LIMIT_MAX_UPLOADS = 5

/** Test mode header name */
const TEST_MODE_HEADER = 'x-test-mode'

/** Whether test mode is enabled (only in non-production) */
const TEST_MODE_ENABLED = process.env.NODE_ENV !== 'production'

// ============================================================================
// IN-MEMORY RATE LIMIT STORE
// ============================================================================

/**
 * In-memory store for rate limiting
 * Maps IP addresses to their request counts and reset times
 * 
 * Warning: This store is reset on server restart. For production,
 * use Redis or another distributed store for persistence across
 * server instances.
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Cleanup interval to remove expired entries from the rate limit store
 * Runs every 60 seconds to prevent memory leaks
 */
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean up every minute

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extracts the client IP address from request headers
 * Handles proxied requests by checking X-Forwarded-For and X-Real-IP headers
 * 
 * @param request - The incoming Next.js request
 * @returns Client IP address string
 */
function getClientIP(request: NextRequest): string {
  // Check for forwarded headers (behind proxy/load balancer)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // X-Forwarded-For may contain multiple IPs, take the first (client)
    return forwarded.split(',')[0].trim()
  }
  
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  
  // Fallback for development or direct connections
  return 'unknown'
}

/**
 * Checks if a request is allowed under rate limiting rules
 * 
 * @param ip - Client IP address
 * @param endpoint - Endpoint identifier for rate limit key
 * @param maxRequests - Maximum allowed requests in the window
 * @returns Object with allowed status, remaining requests, and reset time
 */
function checkRateLimit(
  ip: string,
  endpoint: string,
  maxRequests: number
): { allowed: boolean; remaining: number; resetTime: number } {
  // Create unique key for this IP + endpoint combination
  const key = `${ip}:${endpoint}`
  const now = Date.now()
  
  const entry = rateLimitStore.get(key)
  
  // If no entry exists or window has expired, create new entry
  if (!entry || now > entry.resetTime) {
    const newEntry = { count: 1, resetTime: now + RATE_LIMIT_WINDOW }
    rateLimitStore.set(key, newEntry)
    return { allowed: true, remaining: maxRequests - 1, resetTime: newEntry.resetTime }
  }
  
  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime }
  }
  
  // Increment count and allow
  entry.count++
  rateLimitStore.set(key, entry)
  return { allowed: true, remaining: maxRequests - entry.count, resetTime: entry.resetTime }
}

// ============================================================================
// PROXY HANDLER
// ============================================================================

/**
 * Checks if test mode is active for this request
 * Test mode bypasses rate limiting for automated testing
 * 
 * @param request - The incoming Next.js request
 * @returns True if test mode should be active
 */
function isTestMode(request: NextRequest): boolean {
  if (!TEST_MODE_ENABLED) return false
  return request.headers.get(TEST_MODE_HEADER) === 'true'
}

/**
 * Main proxy function that processes all incoming requests
 * 
 * Rate limiting rules:
 * - POST /api/grade: 5 requests/minute (stricter for file uploads)
 * - Other /api/* endpoints: 20 requests/minute
 * 
 * Test mode (X-Test-Mode: true header) bypasses rate limiting in non-production
 * 
 * Response headers include rate limit info:
 * - X-RateLimit-Limit: Maximum requests allowed
 * - X-RateLimit-Remaining: Requests remaining in current window
 * - X-RateLimit-Reset: Unix timestamp when window resets
 * 
 * @param request - The incoming Next.js request
 * @returns NextResponse either continuing or blocking the request
 */
export function proxy(request: NextRequest) {
  // Check for test mode bypass (only in non-production environments)
  if (isTestMode(request)) {
    const response = NextResponse.next()
    response.headers.set('X-Test-Mode', 'bypassed')
    return response
  }
  
  const ip = getClientIP(request)
  const path = request.nextUrl.pathname
  const method = request.method
  
  // Apply stricter rate limiting to grading endpoint (only for POST/processing methods)
  // This protects against abuse of the resource-intensive AI grading operation
  if (path.startsWith('/api/grade') && method === 'POST') {
    const result = checkRateLimit(ip, 'grade', RATE_LIMIT_MAX_UPLOADS)
    
    if (!result.allowed) {
      // Return 429 Too Many Requests with rate limit info
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX_UPLOADS),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(result.resetTime / 1000)),
          }
        }
      )
    }
    
    // Add rate limit headers to successful response
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX_UPLOADS))
    response.headers.set('X-RateLimit-Remaining', String(result.remaining))
    response.headers.set('X-RateLimit-Reset', String(Math.floor(result.resetTime / 1000)))
    
    return response
  }
  
  // Allow non-POST methods to pass through to handlers (they'll return 405 Method Not Allowed)
  if (path.startsWith('/api/grade')) {
    return NextResponse.next()
  }
  
  // General rate limiting for other API endpoints
  if (path.startsWith('/api/')) {
    const result = checkRateLimit(ip, 'api', RATE_LIMIT_MAX_REQUESTS)
    
    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        },
        { status: 429 }
      )
    }
  }
  
  return NextResponse.next()
}

// ============================================================================
// ROUTE CONFIGURATION
// ============================================================================

/**
 * Configure which routes the proxy applies to
 * Only API routes are rate-limited; static assets and pages are not
 */
export const config = {
  matcher: '/api/:path*',
}