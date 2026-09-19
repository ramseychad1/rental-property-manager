// next/image refuses to render from a hostname not in remotePatterns - the
// deployed backend's own domain (wherever it lives, e.g. Railway) must be
// included or locally-stored uploads (property/blog images) never render,
// even though the API correctly returns their URL. Derived from
// NEXT_PUBLIC_API_BASE_URL so this doesn't need editing per environment.
const apiRemotePattern = (() => {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_API_BASE_URL);
    return {
      protocol: url.protocol.replace(":", ""),
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
    };
  } catch {
    return null;
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "d2om00vm7sdvbc.cloudfront.net" },
      { protocol: "https", hostname: "d3jxmneabzth3l.cloudfront.net" },
      { protocol: "http", hostname: "localhost", port: "3000" },
      { protocol: "http", hostname: "localhost", port: "8001" },
      { protocol: "http", hostname: "127.0.0.1", port: "8001" },
      ...(apiRemotePattern ? [apiRemotePattern] : []),
    ],
    minimumCacheTTL: 300,
  },
  typedRoutes: false,
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
  ],
  turbopack: {
    root: import.meta.dirname,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
