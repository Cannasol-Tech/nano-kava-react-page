/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: generates plain HTML files — no Next.js server runs in production.
  // This mitigates GHSA-h25m-26qc-wcjf (Server Components DoS) and
  // GHSA-9g9p-9gw9-jx7f (Image Optimizer DoS), both of which require a live server.
  output: 'export',
  trailingSlash: true,
  images: {
    // Disable the Next.js Image Optimizer (not needed for static export).
    // Also mitigates GHSA-9g9p-9gw9-jx7f — remotePatterns DoS vector is unused.
    unoptimized: true,
  },
};

module.exports = nextConfig;
