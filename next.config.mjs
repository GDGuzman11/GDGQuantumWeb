/** @type {import('next').NextConfig} */

// Static security headers applied to every route (Phase 5). The Content-
// Security-Policy is NOT here — it's set per-request in middleware.ts so it can
// carry a fresh nonce for Next's inline bootstrap scripts (no unsafe-inline).
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
];

const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // argon2 ships a native .node addon — keep it external so webpack doesn't try to
  // bundle/parse the binary (it's require()d at runtime in the Node server).
  experimental: {
    serverComponentsExternalPackages: ['@node-rs/argon2'],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
