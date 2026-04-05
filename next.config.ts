import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  
  // Enable React strict mode for better security practices
  reactStrictMode: true,
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          // X-Frame-Options removed for sandbox preview compatibility
          // In production, use: value: 'SAMEORIGIN' or specific allowlist

          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Enable XSS protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Referrer policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions policy (restrict features)
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://openrouter.ai",
              // frame-ancestors removed for sandbox preview compatibility
              // In production, use: "frame-ancestors 'self'"
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  
  // Experimental features
  experimental: {
    proxyClientMaxBodySize: '150mb',
    serverActions: {
      bodySizeLimit: '150mb',
    },
  },
};

export default nextConfig;
