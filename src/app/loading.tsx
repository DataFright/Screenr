/**
 * @fileoverview Loading Skeleton Page
 * 
 * Displays a skeleton loading state while the main page is loading.
 * Matches the layout and structure of the main page for a smooth
 * loading experience without layout shift.
 * 
 * This component is automatically shown by Next.js when:
 * - The page is initially loading
 * - Data is being fetched during navigation
 * - The page component is being streamed
 * 
 * @module app/loading
 * @requires @/components/ui/card - Card components
 * @requires @/components/ui/skeleton - Skeleton loading component
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Loading Skeleton Component
 * 
 * Renders a visual placeholder that mimics the main page layout:
 * - Header with title and subtitle skeletons
 * - Left panel: Job details card and upload card skeletons
 * - Right panel: Results card skeleton
 * - Footer skeleton
 * 
 * Uses Skeleton components from shadcn/ui which animate with a
 * subtle pulse effect to indicate loading state.
 * 
 * @returns Full-page loading skeleton UI
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#1a0a0a] dark:to-[#2d1212]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Skeleton */}
        <div className="text-center mb-8">
          <Skeleton className="h-10 w-40 mx-auto mb-2" />
          <Skeleton className="h-6 w-80 mx-auto" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Panel Skeleton */}
          <div className="space-y-6">
            {/* Job Details Card Skeleton */}
            <Card className="shadow-lg border-0 dark:bg-[#1a1505]">
              <CardHeader className="bg-gradient-to-r from-emerald-700 to-emerald-600 dark:from-emerald-900 dark:to-emerald-800 rounded-t-lg py-5">
                <Skeleton className="h-6 w-32 bg-white/20" />
                <Skeleton className="h-4 w-48 bg-white/20 mt-1" />
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </CardContent>
            </Card>

            {/* Upload Card Skeleton */}
            <Card className="shadow-lg border-0 dark:bg-[#1a1505]">
              <CardHeader className="bg-gradient-to-r from-emerald-700 to-emerald-600 dark:from-emerald-900 dark:to-emerald-800 rounded-t-lg py-5">
                <Skeleton className="h-6 w-36 bg-white/20" />
                <Skeleton className="h-4 w-52 bg-white/20 mt-1" />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center">
                  <Skeleton className="h-12 w-12 mx-auto rounded-full" />
                  <Skeleton className="h-4 w-40 mx-auto mt-4" />
                  <Skeleton className="h-3 w-32 mx-auto mt-2" />
                </div>
              </CardContent>
            </Card>

            {/* Buttons Skeleton */}
            <div className="flex gap-3">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>

          {/* Right Panel Skeleton */}
          <Card className="shadow-lg border-0 h-full dark:bg-[#1a1505]">
            <CardHeader className="bg-gradient-to-r from-emerald-700 to-emerald-600 dark:from-emerald-900 dark:to-emerald-800 rounded-t-lg py-5">
              <Skeleton className="h-6 w-36 bg-white/20" />
              <Skeleton className="h-4 w-48 bg-white/20 mt-1" />
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Skeleton className="h-12 w-12 mx-auto rounded-full" />
                <Skeleton className="h-4 w-48 mx-auto mt-4" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Skeleton */}
        <div className="mt-12 text-center">
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </div>
    </div>
  )
}
