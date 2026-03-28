/**
 * @fileoverview 404 Not Found Page
 * 
 * Custom 404 page displayed when users navigate to a non-existent route.
 * Provides a friendly error message and navigation back to the home page.
 * 
 * @module app/not-found
 * @requires next/link - Link component for navigation
 */

'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileQuestion, Home } from 'lucide-react'
import Link from 'next/link'

/**
 * Not Found Page Component
 * 
 * Renders a friendly 404 error page with:
 * - Visual icon indicating page not found
 * - Brief explanation message
 * - Large "404" text for clarity
 * - Button to return to the home page
 * 
 * @returns Full-page 404 UI
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#1a0a0a] dark:to-[#2d1212] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-0 dark:bg-[#1a1505]">
        <CardHeader className="text-center">
          {/* Visual indicator for not found */}
          <div className="mx-auto mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full w-fit">
            <FileQuestion className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-2xl">Page Not Found</CardTitle>
          <CardDescription>
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Large 404 indicator */}
          <div className="text-center text-6xl font-bold text-muted-foreground/30">
            404
          </div>
          {/* Home navigation */}
          <Link href="/" className="block">
            <Button className="w-full bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 text-white">
              <Home className="mr-2 h-4 w-4" />
              Back to Screenr
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
