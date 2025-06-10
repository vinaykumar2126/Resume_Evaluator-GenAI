/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // For Docker optimization
  outputFileTracingRoot: process.cwd(), // Moved out of experimental
  serverExternalPackages: ['pdf-parse'], // Moved out of experimental and renamed
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;