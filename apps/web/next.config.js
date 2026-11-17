const path = require('path');

const nextConfig = {
  // The service worker file must always be re-checked, so updates reach people quickly.
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
  transpilePackages: ['@repo/api-client', '@repo/types', '@repo/validators'],
  webpack: (config) => {
    config.resolve.alias['@tanstack/react-query'] = path.resolve(
      __dirname,
      '../../node_modules/@tanstack/react-query'
    );
    return config;
  },
};

module.exports = nextConfig;
