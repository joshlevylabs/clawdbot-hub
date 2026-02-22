/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    // Skip ESLint during builds
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
// Trigger rebuild 1770130257
