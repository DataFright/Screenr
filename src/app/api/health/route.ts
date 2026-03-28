/**
 * @fileoverview Health Check API Endpoint
 * 
 * Simple health check endpoint for monitoring and load balancer checks.
 * Returns a JSON response indicating the service is running.
 * 
 * @module api/health
 * @requires next/server - NextResponse
 */

import { NextResponse } from 'next/server'

/**
 * GET handler for health checks
 * 
 * Response includes:
 * - status: "ok" if service is healthy
 * - timestamp: ISO timestamp of the check
 * - message: Human-readable status message
 * 
 * @returns JSON response with health status
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Screenr API is running'
  })
}
