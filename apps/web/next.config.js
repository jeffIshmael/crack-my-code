/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
  async redirects() {
    return [
      {
        source: '/.well-known/farcaster.json',
        destination: 'https://api.farcaster.xyz/miniapps/hosted-manifest/019dee66-24a8-dc8c-f04f-65fcb288fc67',
        permanent: false,
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
