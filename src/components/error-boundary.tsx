/**
 * @fileoverview Error Boundary Components
 * 
 * This module provides error handling components for React:
 * - ErrorBoundary: Class component that catches JavaScript errors in child components
 * - useAsyncError: Hook for throwing async errors to be caught by boundaries
 * - ErrorDisplay: Component for displaying API errors to users
 * 
 * @module components/error-boundary
 * @requires react - React Component, hooks
 * @requires lucide-react - Error icons
 * @requires @/components/ui/button - Button component
 * @requires @/components/ui/card - Card components
 */

'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, RefreshCw } from 'lucide-react'

// ============================================================================
// ERROR BOUNDARY CLASS COMPONENT
// ============================================================================

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 * 
 * Features:
 * - Catches errors during rendering, lifecycle methods, and constructors
 * - Logs errors to console (can be extended to error reporting service)
 * - Shows development error details in development mode
 * - Provides retry functionality to reset the error state
 * 
 * @example
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  /**
   * Update state when an error is thrown
   * Called during the "render" phase, so side-effects are not permitted
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  /**
   * Called after an error has been thrown by a descendant component
   * Used for logging error information
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
    // Log error to monitoring service in production
    console.error('Error caught by boundary:', error, errorInfo)
  }

  /**
   * Resets the error state to retry rendering
   */
  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-lg border-red-200 dark:border-red-900">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-full w-fit">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred. Please try again.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show error details in development mode only */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-md overflow-auto">
                  <p className="text-xs font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <Button 
                onClick={this.handleRetry} 
                className="w-full"
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// ============================================================================
// ASYNC ERROR HANDLING HOOK
// ============================================================================

/**
 * Hook to handle async errors in React components
 * 
 * React error boundaries only catch errors during rendering.
 * This hook allows throwing errors from async code (like effects,
 * event handlers, or async functions) to be caught by error boundaries.
 * 
 * @returns Function that throws an error to be caught by the nearest boundary
 * 
 * @example
 * const throwError = useAsyncError()
 * 
 * useEffect(() => {
 *   fetchData().catch(err => throwError(err))
 * }, [])
 */
export function useAsyncError() {
  const [, setError] = React.useState<Error | null>(null)
  
  return React.useCallback((error: Error) => {
    setError(() => {
      throw error
    })
  }, [])
}

// ============================================================================
// ERROR DISPLAY COMPONENT
// ============================================================================

interface ErrorDisplayProps {
  /** Error title (optional) */
  title?: string
  /** Error message to display */
  message: string
  /** Error code for reference (optional) */
  code?: string
  /** Retry callback (optional) */
  onRetry?: () => void
}

/**
 * Error Display Component
 * 
 * Displays API errors to users in a consistent, styled card format.
 * Includes an error icon, title, message, and optional retry button.
 * 
 * Features:
 * - Red-tinted styling for error visibility
 * - Error code display for support reference
 * - Retry button when onRetry callback is provided
 * - Responsive design with proper spacing
 * 
 * @param props - Component props
 * @returns Card element displaying the error
 * 
 * @example
 * <ErrorDisplay
 *   title="Upload Failed"
 *   message="The file is too large. Maximum size is 10MB."
 *   code="FILE_TOO_LARGE"
 *   onRetry={() => resetUpload()}
 * />
 */
export function ErrorDisplay({ title = 'Error', message, code, onRetry }: ErrorDisplayProps) {
  return (
    <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-red-800 dark:text-red-200">{title}</h3>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{message}</p>
            {code && (
              <p className="text-xs text-red-500 dark:text-red-500 mt-2 font-mono">
                Error code: {code}
              </p>
            )}
            {onRetry && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRetry}
                className="mt-3 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50"
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
