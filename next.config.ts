
import type {NextConfig} from 'next';
import withNextIntl from 'next-intl/plugin';
import withPWAInit from "@ducanh2912/next-pwa";

const withNextIntlPlugin = withNextIntl('./src/i18n.ts');

const withPWA = withPWAInit({
  dest: "public",
  disable: false, // تم تفعيل PWA في وضع التطوير
  sw: "sw.js",
  register: true,
  scope: "/",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  fallbacks: {
    document: "/offline",
  },
  publicExcludes: ["!middleware.js", "!api/**/*"],
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'offlineCache',
          expiration: {
            maxEntries: 200,
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default withPWA(withNextIntlPlugin(nextConfig));
