import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const isDev = process.env.NODE_ENV !== 'production';

const nextConfig: NextConfig = {
  ...(isDev ? {} : { output: 'standalone' }),
  allowedDevOrigins: ['dev.alphapgm.com'],
  transpilePackages: ['@catapp/shared-types', '@catapp/shared-validators', '@catapp/shared-utils'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.digitaloceanspaces.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/:path*`,
      },
      {
        source: '/api/docs',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/docs`,
      },
      {
        source: '/api/docs/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/docs/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
