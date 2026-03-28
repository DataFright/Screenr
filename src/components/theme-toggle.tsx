/**
 * @fileoverview Theme Toggle Component
 * 
 * Button component for switching between light and dark modes.
 * Shows a sun icon in dark mode and moon icon in light mode.
 * 
 * @module components/theme-toggle
 * @requires next-themes - useTheme hook
 * @requires lucide-react - Sun/Moon icons
 * @requires @/components/ui/button - Button component
 */

'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

/**
 * Theme Toggle Button Component
 * 
 * Renders a button that toggles between light and dark themes.
 * Uses a mounted state to prevent hydration mismatch with SSR.
 * 
 * Features:
 * - Shows placeholder during SSR to prevent hydration issues
 * - Displays Sun icon when in dark mode (click to switch to light)
 * - Displays Moon icon when in light mode (click to switch to dark)
 * - Includes accessibility label for screen readers
 * 
 * @returns Button element with theme toggle functionality
 */
export function ThemeToggle() {
  // Get current theme and setter from context
  const { theme, setTheme } = useTheme()
  
  // Track mounted state to prevent hydration mismatch
  // (theme is undefined during SSR)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Render placeholder during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="h-9 w-9 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-yellow-400" />
      ) : (
        <Moon className="h-4 w-4 text-slate-600" />
      )}
    </Button>
  )
}
