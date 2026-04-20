/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'replicate.delivery' },
    ],
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes except the embed (which must be iframeable)
        source: '/((?!a/[^/]+/embed).*)',
        headers: [
          ...securityHeaders,
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        // Embed route: allow iframing, skip X-Frame-Options
        source: '/a/:slug/embed',
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;
