/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: 'output: standalone' was removed — it's for self-hosting/Docker and
  // is unnecessary on Vercel.
  images: {
    // CHANGED: was `unoptimized: true`, which disabled ALL Next.js image
    // optimization and made every <Image> serve the raw full-resolution source
    // file (ignoring width/height/sizes). Enabling optimization lets Next.js
    // resize + convert to AVIF/WebP per device automatically.
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
