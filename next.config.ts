import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Security headers to prevent clickjacking and other attacks
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry build options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps if auth token is available
  silent: !process.env.SENTRY_AUTH_TOKEN,

  // Wipe source maps after upload for security
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },

  // Disable telemetry
  telemetry: false,

  // Disable Sentry build-time features if no DSN configured
  disableLogger: true,

  // CRITICAL: Disable automatic page/component wrapping.
  // Sentry's auto-wrap injects error boundaries around pages/layouts that
  // interfere with Next.js 16's React 19 transition system, causing the
  // scheduler to get stuck with expired lanes and breaking all client-side
  // navigation (router.push, Link clicks).
  autoInstrumentServerFunctions: false,
  autoInstrumentMiddleware: false,
  autoInstrumentAppDirectory: false,
});
