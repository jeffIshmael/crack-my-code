/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
  async headers() {
    return [
      {
        source: '/.well-known/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      { source: '/games', destination: '/' },
      { source: '/wallet', destination: '/' },
      { source: '/about', destination: '/' },
      { source: '/stats', destination: '/' },
      { source: '/terms', destination: '/' },
      { source: '/privacy', destination: '/' },
      { source: '/contact', destination: '/' },
    ]
  },
};

module.exports = nextConfig;
