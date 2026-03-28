/**
 * @fileoverview Mobile Detection Hook
 * 
 * React hook for detecting mobile viewport size.
 * Used for responsive UI components that need to adjust behavior
 * based on screen size.
 * 
 * @module hooks/use-mobile
 * @requires react - useState, useEffect hooks
 */

import * as React from "react"

/** Breakpoint width for mobile detection (768px = md breakpoint in Tailwind) */
const MOBILE_BREAKPOINT = 768

/**
 * Hook to detect if the current viewport is mobile-sized
 * 
 * Listens for viewport resize events and updates the isMobile state
 * when the viewport width crosses the mobile breakpoint.
 * 
 * @returns boolean - true if viewport width is less than MOBILE_BREAKPOINT
 * 
 * @example
 * function MyComponent() {
 *   const isMobile = useIsMobile()
 *   return (
 *     <div className={isMobile ? 'mobile-layout' : 'desktop-layout'}>
 *       Content
 *     </div>
 *   )
 * }
 */
export function useIsMobile() {
  // undefined initial state to prevent hydration mismatch
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Create media query listener for viewport changes
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Add listener and set initial value
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    
    // Cleanup listener on unmount
    return () => mql.removeEventListener("change", onChange)
  }, [])

  // Convert undefined to false for consistent return type
  return !!isMobile
}
