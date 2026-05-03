import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "135.125.159.142",
        port: "8002",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "media.geoclic.fr",
        pathname: "/media/**",
      },
    ],
  },
};

export default withPWA(nextConfig);
