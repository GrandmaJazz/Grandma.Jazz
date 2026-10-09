/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: 'output: standalone' was removed — it's for self-hosting/Docker and
  // is unnecessary on Vercel.
  images: {
    // Serve the available source assets while the hosting image optimizer
    // rejects new requests with OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "source.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "ext.same-assets.com", pathname: "/**" },
      { protocol: "https", hostname: "ugc.same-assets.com", pathname: "/**" },
      // Product/card images served from S3:
      { protocol: "https", hostname: "grandma-jazz-uploads.s3.ap-southeast-2.amazonaws.com", pathname: "/**" },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  trailingSlash: true,
  // Middleware preserves page slashes while Apple and admin APIs stay direct.
  skipTrailingSlashRedirect: true,

  // The event platform runs independently on the VPS. Keep every public
  // booking, ticket, wallet and organizer URL on grandmajazz.com.
  async rewrites() {
    const origin = process.env.EVENTS_PLATFORM_ORIGIN || 'https://185-111-159-228.sslip.io';
    return {
      beforeFiles: [
        // Apply shared chrome styles to the independent event/Garments bundle.
        { source: '/assets/:asset([^/]+[.]css)', destination: '/api/platform-styles/:asset' },
        { source: '/events/:slug([a-z0-9-]+)/register', destination: '/api/platform-page/events/:slug/register' },
        { source: '/events/:slug([a-z0-9-]+)', destination: '/api/platform-page/events/:slug' },
        { source: '/events/:path+', destination: `${origin}/events/:path+` },
        { source: '/assets/:path*', destination: `${origin}/assets/:path*` },
        { source: '/family-wall/:path*', destination: `${origin}/family-wall/:path*` },
        { source: '/family-admin/:path*', destination: `${origin}/family-admin/:path*` },
        // Mutations must reach Express; the HTML page wrapper only accepts GET.
        { source: '/garments/api/:path*', destination: `${origin}/garments/api/:path*` },
        { source: '/garments/:path*', destination: '/api/platform-page/garments/:path*' },
        { source: '/api/members/:path*', destination: `${origin}/api/members/:path*` },
        { source: '/api/brick.png', destination: `${origin}/api/brick.png` },
        { source: '/api/admin/:path*', destination: `${origin}/api/admin/:path*` },
        { source: '/api/garments/:path*', destination: `${origin}/api/garments/:path*` },
        { source: '/uploads/:path*', destination: `${origin}/uploads/:path*` },
        { source: '/brand/:path*', destination: `${origin}/brand/:path*` },
        { source: '/email-assets/:path*', destination: `${origin}/email-assets/:path*` },
      ],
    };
  },

  // ADDED: long-lived caching for static binary assets in /public.
  // These files are content-stable (you version them by changing the filename,
  // e.g. music_in_fix2_webp.glb), so a 1-year immutable cache is safe and makes
  // repeat visits near-instant. Previously these returned max-age=0 / 4h.
  async headers() {
    return [
      {
        source: "/models/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/videos/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
