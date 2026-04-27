/**
 * @fileoverview Global Error Boundary Page
 * 
 * This is the root error boundary that catches errors at the page level.
 * It's activated when an error occurs during rendering, data fetching,
 * or other operations in the page component.
 * 
 * Features:
 * - Catches unexpected JavaScript errors
 * - Shows error details in development mode
 * - Provides retry and home navigation options
 * - Matches the application's styling theme
 * 
 * @module app/error
 * @requires next/link - Link component for navigation
 * @requires react - useEffect hook
 */

'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

/**
 * Global Error Page Component
 * 
 * Renders when an unhandled error occurs in the application.
 * Provides options to retry the operation or return home.
 * 
 * @param error - Error object with optional digest for error tracking
 * @param reset - Function to reset the error boundary and retry
 * @returns Full-page error UI
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Next.js passes a stable digest for grouping server-render errors.
  // Logging both message + digest makes production debugging easier.
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#1a0a0a] dark:to-[#2d1212] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-0 dark:bg-[#1a1505]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-full w-fit">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl">Something Went Wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Show error details in development mode only */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-md overflow-auto">
              <p className="text-xs font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap">
                {error.message}
              </p>
            </div>
          )}
          {/* Retry button - attempts to recover from the error */}
          <Button 
            // reset() asks Next.js to re-render the segment that failed.
            onClick={reset} 
            className="w-full bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 text-white"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          {/* Home navigation - returns to the main page */}
          <Link href="/" className="block">
            <Button variant="outline" className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Back to Screenr
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
