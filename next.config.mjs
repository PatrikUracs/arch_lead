/** @type {import('next').NextConfig} */

// Content-Security-Policy
// - default-src 'self': block everything not explicitly allowed
// - script-src: self + Next.js inline scripts ('unsafe-inline' required for Next hydration)
// - style-src: self + inline styles (Tailwind, component CSS-in-JS)
// - img-src: self + data URIs + Supabase storage + Replicate CDN
// - connect-src: self + Supabase API (anon key calls)
// - font-src: self + Google Fonts
// - frame-ancestors 'none': belt-and-suspenders alongside X-Frame-Options
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.supabase.co https://replicate.delivery",
  "connect-src 'self' https://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // HSTS: 1 year, include subdomains. Only effective over HTTPS (Vercel always serves HTTPS in prod).
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Content-Security-Policy', value: CSP },
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
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
      {
        // Embed route: allow iframing from any origin, override frame-ancestors
        source: '/a/:slug/embed',
        headers: [
          ...securityHeaders.filter((h) => h.key !== 'Content-Security-Policy'),
          {
            key: 'Content-Security-Policy',
            value: CSP.replace("frame-ancestors 'none'", 'frame-ancestors *'),
          },
        ],
      },
    ]
  },
};

export default nextConfig;
