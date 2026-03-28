/**
 * @fileoverview Theme Provider Component
 * 
 * Wrapper component for next-themes ThemeProvider.
 * Enables dark/light mode switching throughout the application.
 * 
 * @module components/theme-provider
 * @requires next-themes - Theme switching library
 */

'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * Theme Provider Component
 * 
 * Wraps next-themes ThemeProvider with default configuration.
 * Provides theme context to all child components.
 * 
 * Usage:
 * ```tsx
 * <ThemeProvider attribute="class" defaultTheme="light">
 *   <App />
 * </ThemeProvider>
 * ```
 * 
 * @param children - Child components to wrap
 * @param props - Additional props passed to next-themes ThemeProvider
 * @returns ThemeProvider wrapper component
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
