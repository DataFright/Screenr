/**
 * @fileoverview Utility Functions for Screenr
 * 
 * This module provides common utility functions used throughout the application.
 * Currently exports the `cn` function for conditional className merging.
 * 
 * @module lib/utils
 * @requires clsx - Conditional class names
 * @requires tailwind-merge - Merge Tailwind CSS classes
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines class names with Tailwind CSS class merging
 * 
 * This function merges class names intelligently:
 * - Handles conditional classes (falsy values are ignored)
 * - Merges Tailwind CSS classes properly (conflicting classes are resolved)
 * 
 * @param inputs - Class values (strings, arrays, objects, or mixed)
 * @returns Merged class string
 * 
 * @example
 * cn('px-4 py-2', isActive && 'bg-blue-500', { 'font-bold': isBold })
 * // Returns: 'px-4 py-2 bg-blue-500 font-bold' (if isActive and isBold are true)
 * 
 * @example
 * cn('p-4', 'p-2') // Returns: 'p-2' (Tailwind merge resolves conflict)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
