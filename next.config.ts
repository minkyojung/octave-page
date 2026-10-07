import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The privacy policy is a static page in public/, linked as /privacy.
  async rewrites() {
    return [{ source: '/privacy', destination: '/privacy.html' }]
  },
}

export default nextConfig
