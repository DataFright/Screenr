/**
 * @fileoverview Root layout component for Screenr application
 * 
 * This is the top-level layout that wraps all pages in the application.
 * It provides:
 * - Font configuration (Geist Sans and Geist Mono)
 * - Metadata for SEO and social sharing
 * - Theme provider for dark mode support
 * - Toast notification providers
 * 
 * @module RootLayout
 * @requires next/font/google - Geist fonts
 * @requires next-themes - Theme provider
 * @requires @/components/ui/toaster - Shadcn toast component
 * @requires @/components/ui/sonner - Sonner toast notifications
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

// ============================================================================
// FONT CONFIGURATION
// ============================================================================

/** Primary sans-serif font for body text */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/** Monospace font for code and technical content */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ============================================================================
// METADATA
// ============================================================================

/**
 * Application metadata for SEO and social sharing
 * Includes OpenGraph and Twitter card configurations
 */
export const metadata: Metadata = {
  title: "Screenr - AI-Powered Resume Screening",
  description: "Screenr uses AI to evaluate and rank resumes for smarter hiring decisions. Upload resumes, define job requirements, and get instant candidate rankings.",
  keywords: ["Screenr", "Resume Screening", "AI Recruiting", "Hiring Tools", "Resume Grading", "HR Tech", "Talent Assessment"],
  authors: [{ name: "Screenr Team" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Screenr - AI-Powered Resume Screening",
    description: "AI-powered resume evaluation and ranking for smarter hiring decisions",
    url: "https://screenr.ai",
    siteName: "Screenr",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Screenr - AI-Powered Resume Screening",
    description: "AI-powered resume evaluation and ranking for smarter hiring decisions",
  },
};

// ============================================================================
// ROOT LAYOUT COMPONENT
// ============================================================================

/**
 * Root layout that wraps all pages
 * 
 * @param children - Child components (pages) to render
 * @returns HTML document structure with providers
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {/* Theme provider enables light/dark mode switching */}
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          {/* Shadcn toast component (legacy) */}
          <Toaster />
          {/* Sonner toast notifications - primary notification system */}
          <Sonner richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
