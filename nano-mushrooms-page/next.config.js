/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: generates plain HTML files — no Next.js server runs in production.
  // This mitigates:
  //   GHSA-h25m-26qc-wcjf  — Server Components DoS (requires running server)
  //   GHSA-4342-x723-ch2f  — Middleware SSRF (we have no middleware; static export
  //                           does not execute middleware in production at all)
  output: 'export',
  trailingSlash: true,
  images: {
    // Disable the Next.js Image Optimizer entirely (not needed for static export).
    // This mitigates all image-optimizer CVEs:
    //   GHSA-9g9p-9gw9-jx7f  — remotePatterns DoS
    //   GHSA-g5qg-72qw-gw5v  — Cache Key Confusion
    //   GHSA-xv57-4mr9-wg8v  — Content Injection
    unoptimized: true,
  },
};

module.exports = nextConfig;
