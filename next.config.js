/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    // Skip ESLint during builds
    ignoreDuringBuilds: true,
  },
  // Exclude large static assets from serverless function bundles
  outputFileTracingExcludes: {
    '*': [
      './public/audio/**',
      './public/data/trading/charts/**',
    ],
  },
}

module.exports = nextConfig
